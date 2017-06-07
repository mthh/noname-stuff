#!/usr/bin/env python3.5
# -*- coding: utf-8 -*-
"""
@author: mz
"""
import os
import sys
import csscompressor
from uuid import uuid4
from shutil import copy
from subprocess import Popen, PIPE

def build_js_file(use_minified, _id):
    p = Popen(['babel',
               'main.js',
               'colors_helpers.js',
               'context-menu.js',
               'discretization_panel.js',
               'discrtiz_links_discont.js',
               'function.js',
               'helpers.js',
               'helpers_calc.js',
               'interface.js',
               'join_popup.js',
               'layers_style_popup.js',
               'layout_features.js',
               'legend.js',
               'map_project.js',
               'symbols_picto.js',
               'projections.js',
               'projection_others.js',
               'tables.js',
               'text_import_wizard.js',
               'zoom_rect.js'], stderr=PIPE, stdout=PIPE)
    r = p.communicate()
    if len(r[1]) > 0 or len(r[0]) == 0:
        print(r[1])
        sys.exit(1)

    previous_files = [i for i in os.listdir() if 'app.' in i]
    for f_path in previous_files:
        os.remove(f_path)

    with open('app.{}.js'.format(_id), 'wb') as f:
        f.write(r[0].decode().replace('''/translation.json''', '''/translation.{}.json'''.format(_id)).encode())

    try:
        existing_locales = os.listdir('../locales/')
        for locale in existing_locales:
            for file in os.listdir('../locales/' + locale):
                if not 'translation.json' in file:
                    os.remove(''.join(['../locales/', locale, '/', file]))
            copy('../locales/{}/translation.json'.format(locale),
                 '../locales/{}/translation.{}.json'.format(locale, _id))

    except Exception as err:
        print(err)
        pass

    if use_minified:
        p = Popen(['uglifyjs',
               'app.{}.js'.format(_id),
               '-o',
               'app.{}.min.js'.format(_id)], stderr=PIPE, stdout=PIPE)
        r = p.communicate()
        if len(r[1]) > 0:
            print(r[1])
            sys.exit(1)

    name = 'app.{}.js'.format(_id) if not use_minified \
        else 'app.{}.min.js'.format(_id)

    with open('../../templates/modules.html', 'r') as f:
        lines = f.readlines()
    ixs = [ix for ix, ln in enumerate(lines) if 'src="static/js/app.' in ln or 'static/css/style.' in ln]
    lines[ixs[0]] = '\t<link href="static/css/style.{}.min.css" rel="stylesheet"  type="text/css">\n'.format(_id)
    lines[ixs[1]] = '\t<script  src="static/js/{}"></script>\n'.format(name)
    with open('../../templates/modules.html', 'w') as f:
        f.writelines(lines)
    os.remove('.babelrc')
    print('OK')
    return name

def build_css_file(_id):
    with open('../css/style.css', 'r') as f:
        css = f.read()
    try:
        comp = csscompressor.compress(css)
        try:
            previous_stylesheet = [i for i in os.listdir('../css') if 'style.' in i and '.min.css' in i]
            for f_path in previous_stylesheet:
                os.remove('../css/' + f_path)
        except Exception as err:
            print('Error while removing previous css files :')
            print(err)
        with open('../css/style.{}.min.css'
                  .format(_id), 'w') as f:
            f.write(comp)
    except Exception as err:
        print('Error while compressing css files :')
        print(err)

def is_node_modules_present():
    return ('node_modules' in os.listdir('../../magrit_app/static/js/'))

def install_package_js():
    print('Installing node dependencies...')
    copy('package.json', '../../magrit_app/static/js/package.json')
    os.chdir('../../magrit_app/static/js/')
    p = Popen(['npm', 'install'], stdout=PIPE, stderr=PIPE)
    r = p.communicate()
    if len(r[1]) > 0 and not 'WARN' in r[1].decode():
        print("Error when installing node dependencies : ", r[1])
        sys.exit(1)
    os.remove('package.json')
    os.chdir('../../../misc/jsbuild')

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.realpath(__file__)))
    use_minified = True if len(sys.argv) > 1 and '-m' in sys.argv[1] else False
    if not is_node_modules_present():
        install_package_js()
    copy('.babelrc', '../../magrit_app/static/js')
    os.chdir('../../magrit_app/static/js')
    _id = uuid4().hex[10:22]
    build_css_file(_id)
    name = build_js_file(use_minified, _id)
    if 'VIRTUAL_ENV' in os.environ:
        try:
            import magrit_app
            installed_dir = magrit_app.__file__.replace('__init__.py', '')
        except ImportError:
            raise ValueError(
                'Magrit should have been installed before '
                'building js files in the virtual environnement')
        except Exception as err:
            raise ValueError('Unable to locate js directory')
        else:
            previous_files = [i for i in os.listdir(installed_dir + 'static/js/') if 'app.' in i]
            for f_path in previous_files:
                os.remove(installed_dir + 'static/js/' + f_path)
            copy(name, installed_dir + "static/js/" + name)
            copy('../css/style.min.css', installed_dir + "static/css/style.min.css")
            copy('../../templates/modules.html', installed_dir + "templates/modules.html")
