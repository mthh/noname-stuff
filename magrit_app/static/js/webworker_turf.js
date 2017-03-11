importScripts('/static/js/lib/turf.min.js', '/static/js/lib/proj4.js');
onmessage = function(e){
    let [func_name, topojson_layer, options] = e.data;
    let geojson_layer = make_geojson_layer(topojson_layer);
    let result;
    if(func_name == 'grid'){
        let mask = make_geojson_mask(topojson_layer);
        result = computeGrid(layer, options.bbox, options.resolution, options.field_name);
    } else if (func_name == 'olson'){
        result = [];
    } else if (func_name == 'dougenik'){
        result = [];
    }

    postMessage([result]);
}

function make_geojson_layer(topojson_layer){
    let layer_name = Object.getOwnPropertyNames(topojson_layer.objects)
    return {
      type: 'FeatureCollection',
      features: topojson.feature(topojson_layer, topojson_layer.objects[layer_name]).features
    };
}

function make_geojson_mask(topojson_layer){
    let feature = [];
    let layer_name = Object.getOwnPropertyNames(topojson_layer.objects)
    let geom = topojson.merge(topojson_layer, topojson_layer.objects[layer_name].geometries);

    return {
      type: 'FeatureCollection',
      features: [{properties: {'name': 'mask'}, type: 'Feature', geometry: geom}]
    };
}

function computeGrid(layer, bbox_layer, resolution, field_name, mask){
    let grid = turf.squareGrid(bbox_layer, resolution, "kilometers");
    let mask_geom = mask.features[0].geometry;
    let nb_cell = grid.features.length,
        nb_ft = layer.features.length;
    let values = layer.features.map(o => +o.properties[field_name]);
    let result = [];
    for(let j = 0; j < nb_cell; j++){
        let cell = grid.features[j];
        let intersected_cell = turf.intersect(cell.geometry, mask_geom);
        if(intersected_cell){
          let intersected_cell_area = turf.area(intersected_cell.geometry),
              _dens = [];
          for(let i = 0; i < nb_ft; i++){
              let intersection = turf.intersect(cell.geometry, layer.features[i].geometry);
              if(intersection){
                  _dens.push((turf.area(intersection) / turf.area(layer.features[i].geometry)) * values[i]);
              }
          }
          let sum = 0;
          for(let z=0; z < _dens.length; z++){ sum = sum + _dens[z] }
          intersected_cell.properties.densitykm = sum / intersected_cell_area;
          result.push(intersected_cell);
        }
    }
    return {
      type: 'FeatureCollection',
      features: result
    };
}
