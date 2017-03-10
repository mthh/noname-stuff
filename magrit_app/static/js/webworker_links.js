importScripts('/static/js/lib/topojson-client.2.1.0.min.js');
onmessage = function(e) {
  let [topo_to_use, layer_name, csv_table, field_i, field_j, field_fij, join_field] = e.data;
  let ft = topojson.feature(topo_to_use, topo_to_use.objects[layer_name]).features;
  let _ft = new Map();
  let result = [];

  for(let i = 0, len_i = ft.length; i < len_i; i++){
      let coords;
      if(ft.geometry.type.indexOf('Multi') == -1){
          coords = d3.geoCentroid(ft.geometry);
      } else {
          let areas = [];
          for(let j = 0; j < ft.geometry.coordinates.length; j++){
            areas.push(path.area({
              type: ft.geometry.type,
              coordinates: [ft.geometry.coordinates[j]]
            }));
          }
          let ix_max = areas.indexOf(max_fast(areas));
          coords = d3.geoCentroid({ type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
      }
      _ft.set(join_field[i], coords);
  }
  for(let i = 0, len_i = csv_table.length; i < len_i; i++){
      let record = csv_table[i];
      let f_i = record[field_i],
          f_j = record[field_j];
      if(_ft.has(f_i) && _ft.has(f_j)){
          let ptA = _ft.get(f_i),
              ptB = _ft.get(f_j),
              fij = record[field_fij]
          result.push({type: 'Feature',
                       properties: {intensity: fij},
                       geometry: {type: 'LineString', coordinates: [ptA, ptB]}
                     });
      }
  }
  let geojson_result = {
      type: 'FeatureCollection',
      features: result
  };
  postMessage(geojson_result);
}
