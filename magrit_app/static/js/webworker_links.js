onmessage = function(e) {
  let [features, csv_table, field_i, field_j, field_fij] = e.data;
  let result = [];
  for(let i = 0, len_i = csv_table.length; i < len_i; i++){
      let record = csv_table[i];
      let f_i = record[field_i],
          f_j = record[field_j];
      if(features.has(f_i) && features.has(f_j)){
          let ptA = features.get(f_i),
              ptB = features.get(f_j),
              fij = +record[field_fij]
          result.push({type: 'Feature',
                       properties: {intensity: fij},
                       geometry: {type: 'LineString', coordinates: [ptA, ptB]}
                     });
      }
  }
  let geojson_result = {
      type: 'FeatureCollection',
      features: result.sort((a ,b) => b.properties.intensity - a.properties.intensity)
  };
  postMessage(geojson_result);
}
