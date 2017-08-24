importScripts('/static/js/lib/topojson-client.3.0.0.min.js');
onmessage = function (e) {
  const [topo_to_use, layer, field, discontinuity_type, discretization_type, id_field] = e.data;
  let result_value = new Map(),
    topo_mesh = topojson.mesh,
    math_max = Math.max;

  const getId = id_field !== undefined
      ? (a, b) => [[a.properties[id_field], b.properties[id_field]].join('_'), [b.properties[id_field], a.properties[id_field]].join('_')]
      : (a, b) => [[a.id, b.id].join('_'), [b.id, a.id].join('_')];

  if (discontinuity_type == 'rel') {
    topo_mesh(topo_to_use, topo_to_use.objects[layer], (a, b) => {
      if (a !== b) {
        let [new_id, new_id_rev] = getId(a, b),
          val_a = a.properties[field],
          val_b = b.properties[field];
        if (val_a == '' || val_a == null || isNaN(+val_a) || val_b == '' || val_b == null || isNaN(+val_b)) { return; }
        if (!(result_value.get(new_id) || result_value.get(new_id_rev))) {
          const value = math_max(+val_a / +val_b, +val_b / +val_a);
          result_value.set(new_id, value);
        }
      }
      return false;
    });
  } else {
    topo_mesh(topo_to_use, topo_to_use.objects[layer], (a, b) => {
      if (a !== b) {
        let [new_id, new_id_rev] = getId(a, b),
          val_a = a.properties[field],
          val_b = b.properties[field];
        if (val_a == '' || val_a == null || isNaN(+val_a) || val_b == '' || val_b == null || isNaN(+val_b)) { return; }
        if (!(result_value.get(new_id) || result_value.get(new_id_rev))) {
          const value = math_max(+val_a - +val_b, +val_b - +val_a);
          result_value.set(new_id, value);
        }
      }
      return false;
    });
  }

  let arr_disc = [],
    arr_tmp = [];
  let entries = Array.from(result_value.entries());
  for (let i = 0, n = entries.length; i < n; i++) {
    let kv = entries[i];
    if (!isNaN(kv[1])) {
      arr_disc.push(kv);
      arr_tmp.push(kv[1]);
    }
  }

  arr_disc.sort((a, b) => a[1] - b[1]);
  arr_tmp.sort((a, b) => a - b);

  let nb_ft = arr_disc.length,
    d_res = [];
  for (let i = 0; i < nb_ft; i++) {
    let id_ft = arr_disc[i][0],
      val = arr_disc[i][1],
      datum = topo_mesh(topo_to_use, topo_to_use.objects[layer], (a, b) => {
        let a_id = id_ft.split('_')[0],
          b_id = id_ft.split('_')[1];
        const [ref_a_id, ref_b_id] = getId(a, b)[0].split('_');
        return a != b
                  && (ref_a_id === a_id && ref_b_id === b_id || ref_a_id === b_id && ref_b_id === a_id);
      });
    d_res.push([val, { id: id_ft, disc_value: val }, datum]);
  }
  d_res.sort((a, b) => b[0] - a[0]);
  postMessage([arr_tmp, d_res]);
};
