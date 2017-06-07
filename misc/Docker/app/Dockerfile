####################################################################
# Working config file building an "all-in one" (and heavy..)
# image of the app and making it accessible on port 9999
# (but it should be splited in multiple containers).
# Configured in order to avoid using cache when fetching the code of the
# application.
####################################################################
# Can be build like this :
#
# $ docker build -t "magrit_app:latest" --build-arg CACHEBUST=$(date +%s) .
#
#
# App can be started like this (exposing port 9999 in the host):
#
# $ docker run --publish "9999:9999" -it "magrit_app:latest"
#
#
# Access to a shell in the container can be obtained with a command like :
#
# $ docker run -it --entrypoint=/bin/bash "magrit_app:latest"
#


FROM ubuntu:latest
MAINTAINER mth

RUN apt-get update && apt-get install -y software-properties-common && add-apt-repository ppa:fkrull/deadsnakes \
		&& apt-get update \
		&& apt-get install -y gcc libpython3.6-dev libopenblas-dev libopenblas-base \
        python3.6 python3.6-dev nodejs gdal-bin libgdal-dev \
        libfreetype6-dev libfreetype6 libproj-dev libspatialindex-dev libv8-3.14-dev libffi-dev \
        nodejs nodejs-dev node-gyp npm redis-server libuv1-dev git wget \
		libxslt1-dev libxml2 libxml2-dev libkml-dev \
        && npm -g install topojson \
        && rm -rf /var/lib/apt/lists/* \
        && ln -s /usr/bin/nodejs /usr/bin/node

WORKDIR /home

ENV GDALINST /home/gdalinstall
ENV GDALBUILD /home/gdalbuild
ENV GDALOPTS="  --with-geos \
		        --with-expat \
		        --without-libtool \
		        --without-gif \
		        --without-pg \
		        --without-grass \
		        --without-libgrass \
		        --without-cfitsio \
		        --without-pcraster \
		        --without-netcdf \
		        --without-gif \
		        --without-ogdi \
		        --without-fme \
		        --without-hdf4 \
		        --with-spatialite \
		        --with-static-proj4=/usr/lib"

RUN mkdir $GDALBUILD && mkdir $GDALINST && cd $GDALBUILD && wget http://download.osgeo.org/gdal/2.1.3/gdal-2.1.3.tar.gz \
    && tar -xzf gdal-2.1.3.tar.gz && cd gdal-2.1.3 && ./configure --prefix=$GDALINST/gdal-2.1.3 $GDALOPTS \
	&& make -s -j 2 && make install

ENV PATH="${GDALINST}/gdal-2.1.3/bin:${PATH}"
ENV LD_LIBRARY_PATH="${GDALINST}/gdal-2.1.3/lib:${LD_LIBRARY_PATH}"

ARG CACHEBUST=1

RUN mkdir /home/app && cd /home/app && mkdir magrit
COPY magrit /home/app/magrit

RUN wget https://bootstrap.pypa.io/get-pip.py && python3.6 get-pip.py

RUN cd /home/app/magrit/ \
    && pip3.6 install -U -r requirements-dev.txt \
    && python3.6 setup.py install
RUN cd /home/app && cp /usr/local/lib/python3.6/dist-packages/magrit_app-0.3.0-py3.6-linux-x86_64.egg/magrit_app/helpers/*.so /home/app/magrit/magrit_app/helpers/

EXPOSE 9999

CMD service redis-server start \
    && gunicorn "magrit_app.app:create_app()" --bind 0.0.0.0:9999 --worker-class aiohttp.worker.GunicornUVLoopWebWorker --workers 2 --chdir /home/app/magrit/
   
