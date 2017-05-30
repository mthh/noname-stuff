#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys

def get_version():
    with open('__init__.py', 'r') as f:
        ver = f.read()
    ix = ver.find("'")
    return ver[ix+1:ix + ver[ix+1:].find("'")+1]


def save_version(version):
    with open('__init__.py', 'w') as f:
        f.write("# -*- coding: utf-8 -*-\n\n__version__ = '{}'\n".format(version))


def replace_version_docker_file(old_version, new_version):
    with open('../misc/Docker/app/Dockerfile', 'r') as f:
        data = f.read()
    with open('../misc/Docker/app/Dockerfile', 'w') as f:
        f.write(data.replace(old_version, new_version))

    with open('../misc/dockerfiles/Dockerfile', 'r') as f:
        data = f.read()
    with open('../misc/dockerfiles/Dockerfile', 'w') as f:
        f.write(data.replace(old_version, new_version))


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.realpath(__file__)))
    os.chdir('../magrit_app')
    old_version = get_version()
    current_version = list(map(int, old_version.split('.')))
    if 'patch' in sys.argv[1]:
        current_version[2] += 1
    elif 'minor' in sys.argv[1]:
        current_version[1] += 1
    elif 'major' in sys.argv[1]:
        current_version[0] += 1
    current_version_txt = '.'.join(map(str, current_version))
    save_version(current_version_txt)
    replace_version_docker_file(old_version, current_version_txt)
    print(old_version, current_version_txt)
