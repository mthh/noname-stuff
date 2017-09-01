#!/usr/bin/env python3.6
# -*- coding: utf-8 -*-
"""
magrit

Usage:
  magrit
  magrit [--port <port_nb> --name-app <name> --dev]
  magrit [-p <port_nb> -n <name> -d]
  magrit --no-redis
  magrit --version
  magrit --help

Options:
  -h, --help                        Show this screen.
  --version                         Show version.
  --no-redis                        Don't use redis (for standalone use).
  -p <port>, --port <port>          Port number to use (exit if not available) [default: 9999]
  -d, --dev                         Watch for changes in js/css files and update the transpiled/minified versions
  -n <name>, --name-app <name>      Name of the application [default: Magrit]
"""

import os
import sys
import ujson as json
import time
import docopt
import logging
import psutil

import asyncio
import pandas as pd
import numpy as np
import matplotlib; matplotlib.use('Agg')

from base64 import b64encode, urlsafe_b64decode
from contextlib import closing
from zipfile import ZipFile
from datetime import datetime
from io import StringIO, BytesIO

from threading import RLock, Timer
from cryptography import fernet

from subprocess import Popen, PIPE
from socket import socket, AF_INET, SOCK_STREAM
from mmh3 import hash as mmh3_hash
from concurrent.futures import ThreadPoolExecutor #, ProcessPoolExecutor
from concurrent.futures._base import CancelledError
from pyexcel import get_book

# Web related stuff :
import jinja2
import aiohttp_jinja2
try:
    from aioredis import create_pool, create_reconnecting_redis
except:
    pass
from aiohttp import web, ClientSession
from aiohttp_session import (
    get_session, session_middleware, redis_storage,
    setup as aiohttp_session_setup, cookie_storage
    )
from multidict import MultiDict

#try:
from helpers.misc import (
    run_calc, savefile, get_key, fetch_zip_clean, prepare_folder, mmh3_file)
from helpers.cy_misc import get_name, join_field_topojson
from helpers.topo_to_geo import convert_from_topo
from helpers.geo import (
    reproj_convert_layer_kml, reproj_convert_layer, make_carto_doug,
    check_projection, olson_transform, get_proj4_string,
    make_geojson_links, TopologicalError, ogr_to_geojson)
from helpers.stewart_smoomapy import quick_stewart_mod, resume_stewart
from helpers.grid_layer import get_grid_layer
from helpers.error_middleware404 import error_middleware
#except:
#    from .helpers.misc import (
#        run_calc, savefile, get_key, fetch_zip_clean, prepare_folder, mmh3_file)
#    from .helpers.cy_misc import get_name, join_field_topojson
#    from .helpers.topo_to_geo import convert_from_topo
#    from .helpers.geo import (
#        reproj_convert_layer_kml, reproj_convert_layer, make_carto_doug,
#        check_projection, olson_transform, get_proj4_string,
#        make_geojson_links, TopologicalError, ogr_to_geojson)
#    from .helpers.stewart_smoomapy import quick_stewart_mod, resume_stewart
#    from .helpers.grid_layer import get_grid_layer
#    from .helpers.error_middleware404 import error_middleware

pp = '(aiohttp_app) '


@aiohttp_jinja2.template('index.html')
async def index_handler(request):
    # asyncio.ensure_future(
    #     request.app['redis_conn'].incr('view_onepage'),
    #     loop=request.app.loop)
    session = await get_session(request)
    # if 'already_seen' not in session:
    #     asyncio.ensure_future(
    #         request.app['redis_conn'].incr('single_view_onepage'),
    #         loop=request.app.loop)
    session['already_seen'] = True
    return {'app_name': request.app['app_name'],
            'version': request.app['version']}


async def geojson_to_topojson2(data, layer_name):
    # Todo : Rewrite using asyncio.subprocess methods
    # Todo : Use topojson python port if possible to avoid writing a temp. file
    if sys.platform.startswith('win'):
        process = Popen(["node_win-x64\\geo2topo", "{}=-".format(layer_name), "--bbox"],
                        shell=True if 'win' in os.sys.platform else False,
                        stdout=PIPE, stderr=PIPE, stdin=PIPE)
    else:
        process = Popen(["node_linux-x64/geo2topo", "{}=-".format(layer_name), "--bbox"],
                        shell=False,
                        stdout=PIPE, stderr=PIPE, stdin=PIPE)
    stdout, _ = process.communicate(input=data)
    stdout = stdout.decode()
    return stdout


def topojson_to_geojson(data):
    """
    Topojson to geojson back-conversion in python
    (	through cython-written extension)
    """
    return json.dumps(convert_from_topo(data))


async def remove_layer(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])
    user_id = get_user_id(session_redis, request.app['app_users'])
    f_names = posted_data.getall('layer_name')
    for name in f_names:
        f_name = '_'.join([user_id, name])
        request.app['logger'].debug("Deleting  " + name)
        asyncio.ensure_future(
            request.app["redis_conn"].delete(f_name))
    return web.Response(text=json.dumps({"code": "Ok"}))

async def get_sample_layer(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])

    user_id = get_user_id(session_redis, request.app['app_users'])
    name = posted_data.get('layer_name')
    path = request.app['db_layers'][name]
    hash_val = str(mmh3_hash(path))
    f_name = '_'.join([user_id, hash_val])

    asyncio.ensure_future(
        request.app['redis_conn'].incr('sample_layers'))

    result = await request.app['redis_conn'].get(f_name)
    if result:
        result = result.decode()
        request.app['logger'].debug(
            '{} - Used result from redis'.format(user_id))
        request.app['redis_conn'].pexpire(f_name, 86400000)
        return web.Response(text=''.join([
            '{"key":', hash_val,
            ',"file":', result.replace(''.join([user_id, '_']), ''), '}'
            ]))
    else:
        res = await request.app.loop.run_in_executor(
            request.app["ThreadPool"],
            ogr_to_geojson, path)

        request.app['logger'].debug(
            '{} - Transform coordinates from GeoJSON'.format(user_id))
        result = await geojson_to_topojson2(res, name)
        asyncio.ensure_future(
            request.app['redis_conn'].set(
                f_name, result, pexpire=86400000))
        return web.Response(text=''.join(
            ['{"key":', hash_val, ',"file":', result, '}']
            ))

async def convert_topo(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])

    try:
        file_field = posted_data['file[]']
        name = file_field.filename
        data = file_field.file.read()

    except Exception as err:
        request.app['logger'].info("posted data :\n{}\nerr:\n{}"
                   .format(posted_data, err))
        return web.Response(text='{"Error": "Incorrect datatype"}')

    user_id = get_user_id(session_redis, request.app['app_users'])
    hash_val = str(mmh3_hash(data))
    f_name = '_'.join([user_id, hash_val])

    asyncio.ensure_future(
        request.app['redis_conn'].incr('layers'))

    result = await request.app['redis_conn'].get(f_name)
    if result:
        result = result.decode()
        request.app['logger'].debug(
            '{} - Used result from redis'.format(user_id))
        request.app['redis_conn'].pexpire(f_name, 86400000)
        return web.Response(text=''.join([
            '{"key":', hash_val,
            ',"file":', result.replace(hash_val, name), '}'
            ]))

    asyncio.ensure_future(
        request.app['redis_conn'].set(f_name, data, pexpire=86400000))
    request.app['logger'].debug('Caching the TopoJSON')
    return web.Response(text=''.join(
        ['{"key":', hash_val, ',"file":null}']
        ))


def get_user_id(session_redis, app_users, app=None):
    """
    Function to get (or retrieve) the user unique ID
    (ID is used amongst other things to set/get data in/from redis
    and for retrieving the layers decribed in a "preference file" of an user)
    """
    if 'app_user' not in session_redis:
        if app:
            asyncio.ensure_future(
                app['redis_conn'].incr('single_view_modulepage'),
                loop=app.loop)
        user_id = get_key(app_users)
        app_users.add(user_id)
        session_redis['app_user'] = user_id
        return user_id
    else:
        user_id = session_redis['app_user']
        if user_id not in app_users:
            app_users.add(user_id)
        return user_id


def read_shp_crs(path):
    with open(path, 'r') as f:
        proj_info_str = f.read()
    return proj_info_str


def convert_error(message='Error converting input file'):
    return web.Response(text='{{"Error": "{}"}}'.format(message))

async def convert(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])
    user_id = get_user_id(session_redis, request.app['app_users'])
    proj_info_str = None
    # If a shapefile is provided as multiple files
    # (.shp, .dbf, .shx, and .prj are expected), not ziped :
    if "action" in posted_data and "file[]" not in posted_data:
        list_files = []
        for i in range(len(posted_data) - 1):
            field = posted_data.getall('file[{}]'.format(i))[0]
            file_name = ''.join(['tmp{0}'.format(os.path.sep), user_id, '_', field[1]])
            list_files.append(file_name)
            savefile(file_name, field[2].read())
        shp_path = [i for i in list_files if 'shp' in i][0]
        layer_name = shp_path.replace(
            ''.join(['tmp{0}'.format(os.path.sep), user_id, '_']), '').replace('.shp', '')
        hashed_input = mmh3_file(shp_path)
        name = shp_path.split(os.path.sep)[2]
        datatype = "shp"
    # If there is a single file (geojson, kml, gml or zip) to handle :
    elif "action" in posted_data and "file[]" in posted_data:
        try:
            field = posted_data.get('file[]')
            name = field[1]
            layer_name = name.split('.')[0]
            data = field[2].read()
            datatype = field[3]
            hashed_input = mmh3_hash(data)
            filepath = ''.join(['tmp{0}'.format(os.path.sep), user_id, "_", name])
        except Exception as err:
            request.app['logger'].info("posted data :\n{}\nerr:\n{}"
                       .format(posted_data, err))
            return convert_error('Incorrect datatype')

    f_name = '_'.join([user_id, str(hashed_input)])

    asyncio.ensure_future(
        request.app['redis_conn'].incr('layers'))

    result = await request.app['redis_conn'].get(f_name)
    if result:
        request.app['logger'].debug(
            '{} - Used result from redis'.format(user_id))
        request.app['redis_conn'].pexpire(f_name, 86400000)
        if "shp" in datatype:
            proj_info_str = read_shp_crs('tmp{0}'.format(os.path.sep) + name.replace('.shp', '.prj'))

        return web.Response(text=''.join(
            ['{"key":', str(hashed_input),
             ',"file":', result.decode(),
             ',"proj":', json.dumps(get_proj4_string(proj_info_str)),
             '}']))

    if "shp" in datatype:
        clean_files = lambda: [os.remove(_file) for _file in list_files]
        res = await request.app.loop.run_in_executor(
            request.app["ThreadPool"],
            ogr_to_geojson, shp_path)
        if not res:
            clean_files()
            return convert_error()
        result = await geojson_to_topojson2(res, layer_name)
        if not result:
            clean_files()
            return convert_error()

        asyncio.ensure_future(
            request.app['redis_conn'].set(f_name, result, pexpire=86400000))
        proj_info_str = read_shp_crs('tmp{0}'.format(os.path.sep) + name.replace('.shp', '.prj'))
        clean_files()
    elif datatype in ('application/x-zip-compressed', 'application/zip'):
        dataZip = BytesIO(data)
        dir_path = 'tmp{}{}{}'.format(user_id, hashed_input, os.path.sep)

        with ZipFile(dataZip) as myzip:
            list_files = myzip.namelist()
            list_files = [dir_path + i for i in list_files]
            slots = {"shp": None, "prj": None, "dbf": None, "shx": None}
            names = []
            try:
                for f in list_files:
                    name, ext = f.split('.')
                    names.append(name)
                    if 'shp' in ext:
                        slots['shp'] = f
                    elif 'prj' in ext:
                        slots['prj'] = f
                    elif 'shx' in ext:
                        slots['shx'] = f
                    elif 'dbf' in ext:
                        slots['dbf'] = f
                    elif 'cpg' in ext:
                        slots['cpg'] = f
                assert(all(v is not None for v in slots.values()))
                assert(all(name == names[0] for name in names))
                assert(4 <= len(list_files) < 8)
            except Exception as err:
                request.app['logger'].info(
                    'Error with content of zip file : {}'.format(err))
                return convert_error('Error with zip file content')

            os.mkdir(dir_path)
            myzip.extractall(path=dir_path)
            try:
                res = await request.app.loop.run_in_executor(
                    request.app["ThreadPool"],
                    ogr_to_geojson, slots['shp'])
                if not res:
                    return convert_error()
                result = await geojson_to_topojson2(res, layer_name)
                if not result:
                    return convert_error()

                proj_info_str = read_shp_crs(slots['prj'])

                asyncio.ensure_future(
                    request.app['redis_conn'].set(
                        f_name, result, pexpire=86400000))
            except (asyncio.CancelledError, CancelledError):
                return
            except Exception as err:
                request.app['logger'].info(
                    'Error with content of zip file : {}'.format(err))
                return convert_error('Error with zip file content')
            finally:
                [os.remove(dir_path + _file) for _file in os.listdir(dir_path)]
                os.removedirs(dir_path)

    elif ('octet-stream' in datatype or 'text/json' in datatype
            or 'application/geo+json' in datatype
            or 'application/vnd.google-earth.kml+xml' in datatype
            or 'application/gml+xml' in datatype) \
            and ("kml" in name.lower()
                 or "gml" in name.lower() or "geojson" in name.lower()):
        with open(filepath, 'wb') as f:
            f.write(data)
        res = await request.app.loop.run_in_executor(
            request.app["ThreadPool"],
            ogr_to_geojson, filepath)

        if not res:
            return convert_error('Error reading the input file')

        result = await geojson_to_topojson2(res, layer_name)
        if not result:
            return convert_error('Error reading the input file')

        asyncio.ensure_future(
            request.app['redis_conn'].set(
                f_name, result, pexpire=86400000))
    else:
        request.app['logger'].info("Incorrect datatype :\n{}name:\n{}"
                   .format(datatype, name))
        return convert_error('Incorrect datatype')

    request.app['logger'].debug(
        '{} - Converted, stored in redis and sent back to client'
        .format(user_id))
    return web.Response(text=''.join(
        ['{"key":', str(hashed_input),
         ',"file":', result,
         ',"proj":', json.dumps(get_proj4_string(proj_info_str)),
         '}']))


async def convert_extrabasemap(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])
    user_id = get_user_id(session_redis, request.app['app_users'])

    url = posted_data['url']
    layer_name = posted_data['layer_name']
    async with ClientSession(loop=request.app.loop) as client:
        async with client.get(url) as resp:
            assert resp.status == 200
            data = await resp.text()
            data = data.encode()
            hashed_input = mmh3_hash(data)
            f_name = '_'.join([user_id, str(hashed_input)])

            asyncio.ensure_future(
                request.app['redis_conn'].incr('layers'))

            result = await request.app['redis_conn'].get(f_name)
            if result:
                request.app['logger'].debug(
                    '{} - Used result from redis'.format(user_id))
                request.app['redis_conn'].pexpire(f_name, 86400000)
                return web.Response(text=''.join(
                    ['{"key":', str(hashed_input),
                     ',"file":', result.decode(), '}']))

            result = await geojson_to_topojson2(data, layer_name)
            if not result:
                return web.Response(
                    text='{"Error": "Error converting input file"}')
            else:
                asyncio.ensure_future(
                    request.app['redis_conn'].set(
                        f_name, result, pexpire=86400000))

            request.app['logger'].debug(
                '{} - Converted, stored in redis and sent back to client'
                .format(user_id))
            return web.Response(text=''.join(
                ['{"key":', str(hashed_input), ',"file":', result, '}']))


@aiohttp_jinja2.template('modules.html')
async def serve_main_page(request):
    session_redis = await get_session(request)
    get_user_id(session_redis, request.app['app_users'], request.app)
    return {'app_name': request.app['app_name'],
            'version': request.app['version']}


@aiohttp_jinja2.template('contact_form.html')
async def serve_contact_form(request):
    return {"app_name": request.app["app_name"]}


async def store_contact_info(request):
    posted_data = await request.post()
    date = datetime.fromtimestamp(
        time.time()).strftime("%B %d, %Y at %H:%M:%S")
    asyncio.ensure_future(
        request.app['redis_conn'].lpush(
            'contact', json.dumps({
                "name": posted_data.get('name'),
                "email": posted_data.get('email'),
                "subject": posted_data.get('subject'),
                "message": posted_data.get('message'),
                "date": date
                })))
    return web.Response(text='')


async def carto_doug(posted_data, user_id, app):
    st = time.time()
    posted_data = json.loads(posted_data.get("json"))
    f_name = '_'.join([user_id, str(posted_data['topojson'])])
    ref_layer = await app['redis_conn'].get(f_name)
    ref_layer = json.loads(ref_layer.decode())
    new_field = posted_data['var_name']
    iterations = int(posted_data['iterations'])
    n_field_name = list(new_field.keys())[0]
    if len(new_field[n_field_name]) > 0:
        join_field_topojson(ref_layer, new_field[n_field_name], n_field_name)

    tmp_part = get_name()
    tmp_path = ''.join(['tmp{0}'.format(os.path.sep), tmp_part, '.geojson'])
    savefile(tmp_path, topojson_to_geojson(ref_layer).encode())

    try:
        result = await app.loop.run_in_executor(
            app["ThreadPool"],
            make_carto_doug,
            tmp_path, n_field_name, iterations)
    except asyncio.CancelledError:
        app['logger'].info(
            'Cancelled after {:.4f}s : carto_doug'
            .format(time.time()-st))
        return

    os.remove(tmp_path)
    new_name = '_'.join(["Carto_doug", str(iterations), n_field_name])
    res = await geojson_to_topojson2(result, new_name)
    hash_val = mmh3_hash(res)
    asyncio.ensure_future(
        app['redis_conn'].set('_'.join([
            user_id, str(hash_val)]), res, pexpire=86400000))
    asyncio.ensure_future(
        app['redis_conn'].lpush('dougenik_time', time.time()-st))
    app['logger'].info(
        '{} - timing : carto_doug : {:.4f}s'
        .format(user_id, time.time()-st))
    return ''.join(['{"key":', str(hash_val), ',"file":', res, '}'])

# async def compute_discont(posted_data, user_id, app):
#     st = time.time()
#     posted_data = json.loads(posted_data.get("json"))
#     f_name = '_'.join([user_id, str(posted_data['topojson']), "NQ"])
#     ref_layer = await app['redis_conn'].get(f_name)
#     ref_layer = json.loads(ref_layer.decode())
#     new_field = posted_data['join_field']
#
#     n_field_name = list(new_field.keys())[0]
#     if len(new_field[n_field_name]) > 0:
#         join_field_topojson(ref_layer, new_field[n_field_name], n_field_name)
#     ref_layer_geojson = convert_from_topo(ref_layer)
#     tmp_part = get_name()
#     tmp_path = ''.join(['/tmp/', tmp_part, '.geojson'])
#     with open(tmp_path, 'wb') as f:
#         f.write(json.dumps(ref_layer_geojson).encode())
#     new_topojson = await geojson_to_topojson(tmp_path, "-q 1e3")
#     new_topojson = json.loads(new_topojson)
#     res_geojson = app.loop.run_in_executor(
#         app["ProcessPool"],
#         get_borders_to_geojson,
#         new_topojson
#         )
#     savefile(tmp_path, res_geojson)
#     res = await geojson_to_topojson(tmp_path)
#     new_name = ''.join(["Discont_", n_field_name])
#     res = res.replace(tmp_part, new_name)
#     hash_val = mmh3_hash(res)
#     asyncio.ensure_future(
#         app['redis_conn'].set('_'.join([
#             user_id, str(hash_val), "NQ"]), res, pexpire=86400000))
#     app['logger'].info(
#         '{} - timing : dicont_on_py : {:.4f}s'
#         .format(user_id, time.time()-st))
#
#     return ''.join(['{"key":', str(hash_val), ',"file":', res, '}'])

async def links_map(posted_data, user_id, app):
    st = time.time()
    posted_data = json.loads(posted_data.get("json"))

    f_name = '_'.join([user_id, str(posted_data['topojson'])])
    ref_layer = await app['redis_conn'].get(f_name)
    ref_layer = json.loads(ref_layer.decode())
    new_field = posted_data['join_field']

    n_field_name = list(new_field.keys())[0]
    if len(new_field[n_field_name]) > 0:
        join_field_topojson(ref_layer, new_field[n_field_name], n_field_name)
    ref_layer = convert_from_topo(ref_layer)

    result_geojson = await app.loop.run_in_executor(
        app["ThreadPool"],
        make_geojson_links,
        ref_layer,
        posted_data["csv_table"],
        posted_data["field_i"],
        posted_data["field_j"],
        posted_data["field_fij"],
        n_field_name)

    new_name = ''.join(["Links_", n_field_name])
    res = await geojson_to_topojson2(result_geojson, new_name)
    hash_val = mmh3_hash(res)
    asyncio.ensure_future(
        app['redis_conn'].set('_'.join([
            user_id, str(hash_val)]), res, pexpire=86400000))
    app['logger'].info(
        '{} - timing : links_on_py : {:.4f}s'
        .format(user_id, time.time()-st))
    asyncio.ensure_future(
        app['redis_conn'].lpush('links_time', time.time()-st))
    return ''.join(['{"key":', str(hash_val), ',"file":', res, '}'])


async def carto_gridded(posted_data, user_id, app):
    st = time.time()
    posted_data = json.loads(posted_data.get("json"))

    f_name = '_'.join([user_id, str(posted_data['topojson'])])
    ref_layer = await app['redis_conn'].get(f_name)

    ref_layer = json.loads(ref_layer.decode())
    new_field = posted_data['var_name']

    n_field_name = list(new_field.keys())[0]
    if len(new_field[n_field_name]) > 0:
        join_field_topojson(ref_layer, new_field[n_field_name], n_field_name)

    tmp_part = get_name()
    filenames = {"src_layer": ''.join(['tmp{0}'.format(os.path.sep), tmp_part, '.geojson']),
                 "result": None}
    savefile(filenames['src_layer'], topojson_to_geojson(ref_layer).encode())

    try:
        result_geojson = await app.loop.run_in_executor(
            app["ThreadPool"],
            get_grid_layer,
            filenames['src_layer'],
            posted_data["cellsize"],
            n_field_name,
            posted_data["grid_shape"].lower())
    except asyncio.CancelledError:
        app['logger'].info(
            'Cancelled after {:.4f}s : get_grid_layer'
            .format(time.time()-st))
        return
    except (TopologicalError, ValueError) as err:
        return json.dumps({"Error": "geometry_error"})

    new_name = '_'.join(['Gridded',
                         str(posted_data["cellsize"]),
                         n_field_name])
    res = await geojson_to_topojson2(result_geojson.encode(), new_name)

    app['logger'].info(
        '{} - Gridded_on_py - {:.4f}'.format(user_id, st-time.time()))

    hash_val = str(mmh3_hash(res))
    asyncio.ensure_future(
        app['redis_conn'].set('_'.join([
            user_id, hash_val]), res, pexpire=86400000))
    asyncio.ensure_future(
        app['redis_conn'].lpush('gridded_time', time.time()-st))
    return ''.join(['{"key":', hash_val, ',"file":', res, '}'])


async def compute_olson(posted_data, user_id, app):
    st = time.time()
    posted_data = json.loads(posted_data.get("json"))
    f_name = '_'.join([user_id, str(posted_data['topojson'])])

    ref_layer = await app['redis_conn'].get(f_name)
    ref_layer = json.loads(ref_layer.decode())

    scale_values = posted_data['scale_values']
    ref_layer_geojson = convert_from_topo(ref_layer)

    try:
        await app.loop.run_in_executor(
            app["ThreadPool"],
            olson_transform,
            ref_layer_geojson,
            scale_values)
    except asyncio.CancelledError:
        app['logger'].info(
            'Cancelled after {:.4f}s : olson_transform'
            .format(time.time()-st))
        return

    new_name = "_".join(["Olson_carto", str(posted_data["field_name"])])
    res = await geojson_to_topojson2(
        json.dumps(ref_layer_geojson).encode(), new_name)
    hash_val = str(mmh3_hash(res))
    asyncio.ensure_future(
        app['redis_conn'].set('_'.join([
            user_id, hash_val]), res, pexpire=86400000))
    asyncio.ensure_future(
        app['redis_conn'].lpush('olson_time', time.time()-st))
    app['logger'].info(
        '{} - timing : olson-like cartogram : {:.4f}s'
        .format(user_id, time.time()-st))
    return ''.join(['{"key":', hash_val, ',"file":', res, '}'])


async def receiv_layer(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])
    user_id = get_user_id(session_redis, request.app['app_users'])
    layer_name = posted_data['layer_name']
    data = posted_data['geojson']
    h_val = mmh3_hash(data)
    f_name = '_'.join([user_id, str(h_val)])
    res = await geojson_to_topojson2(data.encode(), layer_name)
    asyncio.ensure_future(
        request.app['redis_conn'].set(f_name, res, pexpire=86400000))
    return web.Response(text=''.join(['{"key":', str(h_val), '}']))


async def call_stewart(posted_data, user_id, app):
    st = time.time()
    posted_data = json.loads(posted_data.get("json"))
    f_name = '_'.join([user_id, str(posted_data['topojson'])])
    point_layer = await app['redis_conn'].get(f_name)
    point_layer = json.loads(point_layer.decode())

    new_field1 = posted_data['variable1']
    new_field2 = posted_data['variable2']

    n_field_name1 = list(new_field1.keys())[0]
    if len(new_field1[n_field_name1]) > 0:
        join_field_topojson(point_layer, new_field1[n_field_name1],
                            n_field_name1)

    if new_field2:
        discretization = "percentiles"
        n_field_name2 = list(new_field2.keys())[0]
        if len(new_field2[n_field_name2]) > 0:
            join_field_topojson(point_layer, new_field2[n_field_name2],
                                n_field_name2)
    else:
        discretization = "jenks"
        n_field_name2 = None

    if posted_data['mask_layer']:
        f_name = '_'.join([user_id, str(posted_data['mask_layer'])])
        mask_layer = await app['redis_conn'].get(f_name)

    tmp_part = get_name()
    filenames = {
        'point_layer': ''.join(['tmp/', tmp_part, '.geojson']),
        'mask_layer': ''.join(['tmp/', get_name(), '.geojson'])
                      if posted_data['mask_layer'] != "" else None
        }
    savefile(filenames['point_layer'],
             topojson_to_geojson(point_layer).encode())

    if filenames['mask_layer']:
        savefile(filenames['mask_layer'],
                 topojson_to_geojson(json.loads(mask_layer.decode())).encode())

    reusable_val = '_'.join([user_id,
                             str(posted_data['topojson']),
                             n_field_name1,
                             n_field_name2 if n_field_name2 else "",
                             str(posted_data["span"]),
                             str(posted_data['beta']),
                             str(posted_data['resolution']),
                             posted_data['typefct'].lower()])

    existing_obj = await app['redis_conn'].get(reusable_val)

    try:
        if existing_obj:
            res, breaks = await app.loop.run_in_executor(
                app["ThreadPool"],
                resume_stewart,
                existing_obj,
                int(posted_data['nb_class']),
                discretization,
                posted_data['user_breaks'],
                filenames["mask_layer"])

        else:
            res, breaks, dump_obj = await app.loop.run_in_executor(
                app["ThreadPool"],
                quick_stewart_mod,
                filenames['point_layer'],
                n_field_name1,
                int(posted_data['span']),
                float(posted_data['beta']),
                posted_data['typefct'].lower(),
                int(posted_data['nb_class']),
                discretization,
                posted_data['resolution'],
                filenames["mask_layer"],
                n_field_name2,
                posted_data['user_breaks'])

            asyncio.ensure_future(
                app['redis_conn'].set(
                    reusable_val, dump_obj, pexpire=43200000))
    except asyncio.CancelledError:
        app['logger'].info(
            'Cancelled after {:.4f}s : stewart'
            .format(time.time()-st))
        return

    os.remove(filenames['point_layer'])
    if filenames['mask_layer']:
        os.remove(filenames['mask_layer'])
    new_name = '_'.join(['Smoothed', n_field_name1])
    res = await geojson_to_topojson2(res, new_name)
    hash_val = str(mmh3_hash(res))

    asyncio.ensure_future(
        app['redis_conn'].set('_'.join([
            user_id, hash_val]), res, pexpire=86400000))
    asyncio.ensure_future(
        app['redis_conn'].lpush('stewart_time', time.time()-st))
    app['logger'].info(
        '{} - timing : stewart_on_py : {:.4f}s'
        .format(user_id, time.time()-st))

    return "|||".join([
        ''.join(['{"key":', hash_val, ',"file":', res, '}']),
        json.dumps(breaks)
        ])


async def geo_compute(request):
    s_t = time.time()
    function = request.match_info['function']
    if function not in request.app['geo_function']:
        return web.Response(text=json.dumps(
            {"Error": "Wrong function requested"}))
    else:
        posted_data, session_redis = \
            await asyncio.gather(*[request.post(), get_session(request)])
        user_id = get_user_id(session_redis, request.app['app_users'])
        func = request.app['geo_function'][function]
        request.app['logger'].info(
            'Python - p1 : {:.4f}'.format(time.time()-s_t))
        data_response = await func(posted_data, user_id, request.app)
        return web.Response(text=data_response)


async def handler_exists_layer(request):
    session_redis = await get_session(request)
    user_id = get_user_id(session_redis, request.app['app_users'])
    res = await request.app['redis_conn'].get(
        '_'.join([user_id, request.match_info['expr']]))
    if res:
        return web.Response(
            text=res.decode().replace(''.join([user_id, "_"]), ''))
    else:
        return web.Response(text="")


async def handler_exists_layer2(request):
    session_redis = await get_session(request)
    posted_data = await request.post()
    user_id = get_user_id(session_redis, request.app['app_users'])
    layer_name = posted_data.get('layer')
    layer_name_redis = posted_data.get('layer_name')
    file_format = posted_data.get('format')
    projection = json.loads(posted_data.get('projection'))
    res = await request.app['redis_conn'].get(
            '_'.join([user_id, layer_name_redis])
            )
    if not res:
        request.app['logger'].info(
            '{} - Unable to fetch the requested layer ({}/{})'
            .format(user_id, layer_name, layer_name_redis))
        return web.Response(
            text='{"Error": "Unable to fetch the layer on the server"}')
    elif file_format == "TopoJSON":
        return web.Response(text=res.decode())
    else:
        try:
            res_geojson = topojson_to_geojson(json.loads(res.decode()))
            if "GeoJSON" in file_format:
                return web.Response(text=res_geojson)
            elif "KML" in file_format:
                tmp_path = prepare_folder()
                output_path = ''.join([tmp_path, os.path.sep, layer_name, ".geojson"])
                savefile(output_path, res_geojson.encode())
                result = reproj_convert_layer_kml(output_path)
                os.remove(output_path)
                os.removedirs(tmp_path)
                return web.Response(text=result.decode())
            else:
                out_proj = check_projection(
                    projection["name"] if "name" in projection
                    else projection["proj4string"])
                if not out_proj:
                    return web.Response(
                        text=json.dumps(
                            {'Error': 'app_page.common.error_proj4_string'}))

                available_formats = {"ESRI Shapefile": ".shp",
                                     "KML": ".kml",
                                     "GML": ".gml"}
                ext = available_formats[file_format]
                tmp_path = prepare_folder()
                output_path = ''.join([tmp_path, "/", layer_name, ".geojson"])
                savefile(output_path, res_geojson.encode())
                reproj_convert_layer(
                    output_path, output_path.replace(".geojson", ext),
                    file_format, out_proj
                    )
                os.remove(output_path)
                raw_data, filename = fetch_zip_clean(tmp_path, layer_name)
                if ".zip" in filename:
                    b64_zip = b64encode(raw_data)
                    return web.Response(
                        body=b64_zip,
                        headers=MultiDict({
                            "Content-Type": "application/octet-stream",
                            "Content-Disposition": ''.join(
                                ["attachment; filename=", layer_name, ".zip"]),
                            "Content-length": str(len(b64_zip))}))
                else:
                    return web.Response(text=raw_data.decode())
        except Exception as err:
            request.app['logger'].info(
                '{} - Error {} while converting layer {} to {} format)'
                .format(user_id, err, layer_name, file_format))
            return web.Response(text='{"Error": "Unexpected error"}')
    return web.Response(text='{"Error": "Invalid file format"}')


async def rawcsv_to_geo(data):
    df = pd.read_csv(StringIO(data))
    df.replace(np.NaN, '', inplace=True)
    geo_col_y = [colnb for colnb, col in enumerate(df.columns)
                 if col.lower() in {"y", "latitude", "lat"}
                 ][0] + 1
    geo_col_x = [colnb for colnb, col in enumerate(df.columns)
                 if col.lower() in {"x", "longitude", "lon", "lng", "long"}
                 ][0] + 1
    col_names = df.columns = [i.replace(' ', '_') for i in df.columns]
    # Ugly minified geojson construction "by hand" :
    ft_template_start = \
        '''{"type":"Feature","geometry":{"type":"Point","coordinates":['''
    geojson_features = [
        ''.join([
            ft_template_start,
            '''{0},{1}'''.format(ft[geo_col_x], ft[geo_col_y]),
            ''']},"properties":''',
            str({k: v for k, v in zip(col_names, ft[1:])}).replace("'", '"'),
            '''}'''
            ]) for ft in df.itertuples()]

    return ''.join([
        '''{"type":"FeatureCollection","features":[''',
        ','.join(geojson_features),
        """]}"""
        ])


async def calc_helper(request):
    posted_data = await request.post()
    val1 = np.array(json.loads(posted_data['var1']))
    val2 = np.array(json.loads(posted_data['var2']))
    allowed_types = {"i", "f"}
    if val1.dtype.kind not in allowed_types:
        try:
            val1 = val1.astype(float, copy=False)
        except:
            return web.Response(text='{"Error":"Invalid datatype"}')
    if val2.dtype.kind not in allowed_types:
        try:
            val2 = val2.astype(float, copy=False)
        except:
            return web.Response(text='{"Error":"Invalid datatype"}')
    result = await request.app.loop.run_in_executor(
        request.app['ThreadPool'],
        run_calc, val1, val2, posted_data['operator'])
    return web.Response(text=result)


async def convert_csv_geo(request):
    posted_data, session_redis = \
        await asyncio.gather(*[request.post(), get_session(request)])
    user_id = get_user_id(session_redis, request.app['app_users'])
    st = time.time()
    file_name = posted_data.get("filename")
    data = posted_data.get("csv_file")
    hash_val = str(mmh3_hash(data))

    f_name = '_'.join([user_id, hash_val])

    result = await request.app['redis_conn'].get(f_name)
    if result:
        request.app['logger'].debug(
                '{} - Used result from redis'.format(user_id))
        return web.Response(text=''.join(
            ['{"key":', hash_val, ',"file":', result.decode(), '}']))

    res = await rawcsv_to_geo(data)
    result = await geojson_to_topojson2(res.encode(), file_name)

    if not result:
        return web.Response(text=json.dumps({'Error': 'Wrong CSV input'}))

    asyncio.ensure_future(
        request.app['redis_conn'].set(
            f_name, result, pexpire=86400000))

    request.app['logger'].info(
        '{} - timing : csv -> geojson -> topojson : {:.4f}s'
        .format(user_id, time.time()-st))

    return web.Response(text=''.join(
        ['{"key":', hash_val, ',"file":', result, '}']
        ))

async def get_stats_json(request):
    posted_data = await request.post()
    if not ('data' in posted_data
            and mmh3_hash(posted_data['data']) == 1163649321):
        return web.Response()
    redis_conn = request.app['redis_conn']
    stewart, doug, gridded, olson, links = await asyncio.gather(*[
        redis_conn.lrange('stewart_time', 0, -1),
        redis_conn.lrange('dougenik_time', 0, -1),
        redis_conn.lrange('gridded_time', 0, -1),
        redis_conn.lrange('olson_time', 0, -1),
        redis_conn.lrange('links_time', 0, -1),
        ])
    layers, sample_layers = await asyncio.gather(*[
        redis_conn.get('layers'), redis_conn.get('sample_layers')])
    view_onepage, single_view_onepage = await asyncio.gather(*[
        redis_conn.get('view_onepage'), redis_conn.get('single_view_onepage')])
    contact = await redis_conn.lrange('contact', 0, -1)
    count = await redis_conn.get('single_view_modulepage')
    return web.Response(text=json.dumps(
        {"count": count, "layer": layers,
         "view_onepage": view_onepage,
         "single_view_onepage": single_view_onepage,
         "sample": sample_layers, "contact": contact,
         "t": {"stewart": stewart, "dougenik": doug,
               "gridded": gridded, "olson": olson, "links": links}}))


async def convert_tabular(request):
    st = time.time()
    posted_data = await request.post()

    # For xls, ods and xlsx files :
    allowed_datatypes = (
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.oasis.opendocument.spreadsheet")

    _, name, data, datatype, _ = posted_data.get('file[]')

    if datatype in allowed_datatypes:
        name, extension = name.split('.')
        book = get_book(file_content=data.read(), file_type=extension)
        sheet_names = book.sheet_names()
        csv = book[sheet_names[0]].csv
        # replace spaces in variable names
        firstrowlength = csv.find('\n')
        result = csv[0:firstrowlength].replace(' ', '_') + csv[firstrowlength:]
        message = ["app_page.common.warn_multiple_sheets", sheet_names] \
            if len(sheet_names) > 1 else None
    else:
        result = "Unknown tabular file format"
        request.app['logger'].info(
            'Unknown tabular file format : {} / {}'
            .format(name, datatype))

    request.app['logger'].info(
        ' - timing : spreadsheet -> csv : {:.4f}s'
        .format(time.time()-st))
    return web.Response(text=json.dumps(
        {"file": result, "name": name, "message": message}))

async def fetch_list_extrabasemaps(loop):
    url = 'https://api.github.com/repos/riatelab/basemaps/contents/'
    async with ClientSession(loop=loop) as client:
        async with client.get(url) as resp:
            assert resp.status == 200
            data = await resp.text()
            data = json.loads(data)
            tree_url = [d for d in data
                        if d['name'] == "Countries"][0]['_links']['git']
            base_url = ('https://raw.githubusercontent.com/riatelab/basemaps'
                        '/master/Countries/')
            async with client.get(tree_url + '?recursive=1') as resp:
                assert resp.status == 200
                list_elem = await resp.text()
                list_elem = json.loads(list_elem)
                name_url = []
                for elem in list_elem['tree']:
                    if '.geojson' in elem['path']:
                        p = elem['path']
                        url = base_url + p
                        filename = p.split('/')[0]
                        name_url.append((filename, url))
                return name_url

async def get_extrabasemaps(request):
    list_url = await request.app['redis_conn'].get('extrabasemaps')
    if not list_url:
        list_url = await fetch_list_extrabasemaps(request.app.loop)
        list_url = json.dumps(list_url)
        asyncio.ensure_future(request.app['redis_conn'].set(
                'extrabasemaps', list_url.encode(), pexpire=21600000))
        return web.Response(text=list_url)
    else:
        return web.Response(text=list_url.decode())


def prepare_list_svg_symbols():
    symbols = [i for i in os.listdir("static/img/svg_symbols/") if '.png' in i]
    with open("static/json/list_symbols.json", "w") as f:
        f.write(json.dumps(symbols))


def check_port_available(port_nb):
    if port_nb < 7000:
        return False
    with closing(socket(AF_INET, SOCK_STREAM)) as sock:
        if sock.connect_ex(("0.0.0.0", port_nb)) == 0:
            return False
    return True


async def on_shutdown(app):
    await app["redis_conn"].quit()
    # app["ProcessPool"].shutdown()
    app["ThreadPool"].shutdown()
    for task in asyncio.Task.all_tasks():
        await asyncio.sleep(0)
        info = task._repr_info()
        if "RedisPool" in info[1] and "pending" in info[0]:
            try:
                await asyncio.wait_for(task, 2)
            except asyncio.TimeoutError:
                task.cancel()
        elif "Application.shutdown()" not in info[1]:
            task.cancel()


async def init(loop, port=None, watch_change=False, use_redis=True):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("magrit_app.main")
    if use_redis:
        redis_cookie = await create_pool(
            ('0.0.0.0', 6379), db=0, maxsize=50, loop=loop)
        redis_conn = await create_reconnecting_redis(
            ('0.0.0.0', 6379), db=1, loop=loop)
        app = web.Application(
            loop=loop,
            client_max_size=16384**2,
            middlewares=[
                error_middleware,
                session_middleware(redis_storage.RedisStorage(redis_cookie))])
        app['redis_conn'] = redis_conn
    else:
        from helpers.fakeredis import FakeAioRedisConnection
        fernet_key = fernet.Fernet.generate_key()
        secret_key = urlsafe_b64decode(fernet_key)
        app = web.Application(
            loop=loop,
            client_max_size=16384**2,
            middlewares=[error_middleware])
        aiohttp_session_setup(app, cookie_storage.EncryptedCookieStorage(secret_key))
        app['redis_conn'] = FakeAioRedisConnection(max_age_seconds=3600)
    aiohttp_jinja2.setup(app, loader=jinja2.FileSystemLoader('templates'))
    add_route = app.router.add_route
    add_route('GET', '/', index_handler)
    add_route('GET', '/index', index_handler)
    add_route('GET', '/contact', serve_contact_form)
    add_route('POST', '/contact', store_contact_info)
    add_route('GET', '/modules', serve_main_page)
    add_route('GET', '/modules/', serve_main_page)
    add_route('GET', '/modules/{expr}', serve_main_page)
    # add_route('GET', '/layers', list_user_layers)
    add_route('POST', '/layers/add', receiv_layer)
    add_route('POST', '/layers/delete', remove_layer)
    add_route('GET', '/extrabasemaps', get_extrabasemaps)
    add_route('GET', '/get_layer/{expr}', handler_exists_layer)
    add_route('POST', '/get_layer2', handler_exists_layer2)
    add_route('POST', '/compute/{function}', geo_compute)
    add_route('POST', '/stats', get_stats_json)
    add_route('POST', '/sample', get_sample_layer)
    add_route('POST', '/convert_to_topojson', convert)
    add_route('POST', '/convert_topojson', convert_topo)
    add_route('POST', '/convert_csv_geo', convert_csv_geo)
    add_route('POST', '/convert_extrabasemap', convert_extrabasemap)
    add_route('POST', '/convert_tabular', convert_tabular)
    # add_route('POST', '/cache_topojson/{params}', cache_input_topojson)
    add_route('POST', '/helpers/calc', calc_helper)
    app.router.add_static('/static/', path='static', name='static')
    app['app_users'] = set()
    app['logger'] = logger
    app['version'] = get_version()
    with open('static/json/sample_layers.json', 'r') as f:
        app['db_layers'] = json.loads(f.read().replace('/static', 'static'))[0]
    app['ThreadPool'] = ThreadPoolExecutor(4)
#    app['ProcessPool'] = ProcessPoolExecutor(4)
    app['app_name'] = "Magrit"
    app['geo_function'] = {
        "stewart": call_stewart, "gridded": carto_gridded, "links": links_map,
        "carto_doug": carto_doug, "olson": compute_olson}
    if watch_change:
        app['FileWatcher'] = JsFileWatcher()
#    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    prepare_list_svg_symbols()
    if not port:
        return app
    else:
        handler = app.make_handler()
        srv = await loop.create_server(
            handler, '0.0.0.0', port)
        return srv, app, handler


def _init(loop):
    # Entry point to use with py.test unittest :
    app_real_path = os.path.dirname(os.path.realpath(__file__))
    if app_real_path != os.getcwd():
        os.chdir(app_real_path)
    return init(loop)


def get_version():
    with open('__init__.py', 'r') as f:
        ver = f.read()
    ix = ver.find("'")
    return ver[ix+1:ix + ver[ix+1:].find("'")+1]


def create_app(app_name="Magrit"):
    # Entry point when using Gunicorn to run the application with something like :
    # $ gunicorn "magrit_app.app:create_app('AppName')" \
    #   --bind 0.0.0.0:9999 \
    #   --worker-class aiohttp.worker.GunicornUVLoopWebWorker --workers 2
    app_real_path = os.path.dirname(os.path.realpath(__file__))
    if app_real_path != os.getcwd():
        os.chdir(app_real_path)
    loop = asyncio.get_event_loop()
    app = loop.run_until_complete(init(loop, None))
    app['app_name'] = app_name
    return app

def main():
    # Entry point used when the application is started directly like :
    # $ ./magrit_app/app.py --name AppName --port 9999
    #   or when installed and started like :
    # $ magrit --name AppName --port 9999
    app_real_path = os.path.dirname(os.path.realpath(__file__))
    if app_real_path != os.getcwd():
        os.chdir(app_real_path)
    version = get_version()
    arguments = docopt.docopt(__doc__, version='Magrit ' + version)
    if not arguments["--port"].isnumeric():
        print(__doc__[__doc__.find("Usage:"):__doc__.find("\nOptions")])
        sys.exit("Error: Invalid port value")
    port = int(arguments["--port"])

    if not check_port_available(port):
        print(__doc__[__doc__.find("Usage:"):__doc__.find("\nOptions")])
        sys.exit("Error : Selected port is already in use")

    watch_change = True if arguments['--dev'] else False
    use_redis = False if arguments['--no-redis'] or sys.platform.startswith('win') else True
    #loop = asyncio.get_event_loop()
    loop = asyncio.get_event_loop()
    asyncio.set_event_loop(loop)
    srv, app, handler = loop.run_until_complete(init(loop, port, watch_change, use_redis))
    app['app_name'] = arguments["--name-app"]
    app['logger'].info('serving on' + str(srv.sockets[0].getsockname()))
    if sys.platform.startswith('win'):
        pgui = Popen(['node_win-x64\\nwjs-v0.24.4-win-x64\\nw.exe', 'gui'])
    else:
        pgui = Popen(['node_linux-x64/nwjs-v0.24.4-linux-x64/nw', 'gui'])
##    asyncio.ensure_future(periodic(pgui, app, srv, handler))
    try:
        #loop.run_forever()
        loop.run_until_complete(periodic(pgui, app, srv, handler))
    except KeyboardInterrupt:
        pass
    finally:
        srv.close()
        loop.run_until_complete(srv.wait_closed())
        loop.run_until_complete(app.shutdown())
        loop.run_until_complete(handler.finish_connections(60.0))
        loop.run_until_complete(app.cleanup())
    loop.close()

async def periodic(process, app, srv, handler):
    while True:
        if process.poll() != None:
            for proc in psutil.process_iter():
                if proc.pid == os.getpid():
                    proc.kill()
        await asyncio.sleep(1)

if __name__ == '__main__':
    main()
