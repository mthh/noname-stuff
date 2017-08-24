const drag_elem_geo = d3.drag()
  .subject(function () {
    const t = d3.select(this);
    return {
      x: t.attr('x'),
      y: t.attr('y'),
      map_locked: !!map_div.select('#hand_button').classed('locked'),
    };
  })
  .on('start', () => {
    d3.event.sourceEvent.stopPropagation();
    d3.event.sourceEvent.preventDefault();
    handle_click_hand('lock');
  })
  .on('end', () => {
    if (d3.event.subject && !d3.event.subject.map_locked) { handle_click_hand('unlock'); }
  })
  .on('drag', function () {
    d3.select(this).attr('x', d3.event.x).attr('y', d3.event.y);
  });

const drag_elem_geo2 = d3.drag()
  .filter(function () {
    return current_layers[_app.id_to_layer.get(this.parentElement.id)].draggable;
  })
  .subject(function () {
    // const layer_name = _app.id_to_layer.get(this.parentElement.id);
    const symbol = current_layers[_app.id_to_layer.get(this.parentElement.id)].symbol;
    const t = d3.select(this);
    if (symbol === 'rect') {
      return {
        x: t.attr('x'),
        y: t.attr('y'),
        symbol: symbol,
        map_locked: !!map_div.select('#hand_button').classed('locked'),
      };
    } else if (symbol === 'circle') {
      return {
        x: t.attr('cx'),
        y: t.attr('cy'),
        symbol: symbol,
        map_locked: !!map_div.select('#hand_button').classed('locked'),
      };
    }
  })
  .on('start', function () {
    d3.event.sourceEvent.stopPropagation();
    d3.event.sourceEvent.preventDefault();
    handle_click_hand('lock');
    const zoom = svg_map.__zoom;
    const centroid = path.centroid(this.__data__.geometry);
    centroid[0] = centroid[0] * zoom.k + zoom.x;
    centroid[1] = centroid[1] * zoom.k + zoom.y;
    map.append('rect')
      .attrs({ x: centroid[0] - 2, y: centroid[1] - 2, height: 4, width: 4, id: 'ref_symbol_location' })
      .style('fill', 'red');
  })
  .on('end', () => {
    if (d3.event.subject && !d3.event.subject.map_locked) {
      handle_click_hand('unlock');
    }
    map.selectAll('#ref_symbol_location').remove();
  })
  .on('drag', function () {
    if (d3.event.subject.symbol === 'rect') {
      d3.select(this).attr('x', d3.event.x).attr('y', d3.event.y);
    } else if (d3.event.subject.symbol === 'circle') {
      d3.select(this).attr('cx', d3.event.x).attr('cy', d3.event.y);
    }
  });

const drag_waffle = d3.drag()
  .filter(function () {
    return current_layers[_app.id_to_layer.get(this.parentElement.id)].draggable;
  })
  .subject(function () {
    const t = d3.select(this);
    let prev_translate = t.attr('transform');
    prev_translate = prev_translate ? prev_translate.slice(10, -1).split(',').map(f => +f) : [0, 0];
    return {
      x: t.attr('x') + prev_translate[0],
      y: t.attr('y') + prev_translate[1],
      map_locked: !!map_div.select('#hand_button').classed('locked'),
    };
  })
  .on('start', () => {
    d3.event.sourceEvent.stopPropagation();
    d3.event.sourceEvent.preventDefault();
    handle_click_hand('lock');
  })
  .on('end', function () {
    if (d3.event.subject && !d3.event.subject.map_locked) {
      handle_click_hand('unlock');
    }
    d3.select(this).style('cursor', 'grab');
  })
  .on('drag', function () {
    d3.select(this)
      .attr('transform', `translate(${[d3.event.x, d3.event.y]})`)
      .style('cursor', 'grabbing');
  });

function setSelected(selectNode, value) {
  selectNode.value = value; // eslint-disable-line no-param-reassign
  selectNode.dispatchEvent(new Event('change'));
}

// Function to be called after clicking on "render" in order to close the section 2
// and to have the section 3 opened
function switch_accordion_section(id_elem) {
  document.getElementById(id_elem || 'btn_s3').dispatchEvent(new MouseEvent('click'));
}

function check_remove_existing_box(box_selector) {
  const existing_box = document.querySelector(box_selector);
  if (existing_box) existing_box.remove();
}

function path_to_geojson(layerName) {
  const id_layer = ['#', _app.layer_to_id.get(layerName)].join('');
  const result_geojson = [];
  d3.select(id_layer)
    .selectAll('path')
    .each((d, i) => {
      result_geojson.push({
        type: 'Feature',
        id: i,
        properties: d.properties,
        geometry: { type: d.type, coordinates: d.coordinates },
      });
    });
  return JSON.stringify({
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: result_geojson,
  });
}

function display_error_during_computation(msg) {
  const message = message ? `<br><i>${i18next.t('app_page.common.details')}:</i> ${msg}` : '';
  swal({
    title: `${i18next.t('app_page.common.error')}!`,
    text: `${i18next.t('app_page.common.error_message')}${msg}`,
    customClass: 'swal2_custom',
    type: 'error',
    allowOutsideClick: false,
  });
}

/**
* Perform an asynchronous request
*
* @param {String} method - the method like "GET" or "POST"
* @param {String} url - the targeted url
* @param {FormData} data - Optionnal, the data to be send
* @return {Promise} response
*/
function request_data(method, url, data) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url, true);
    request.onload = resolve;
    request.onerror = reject;
    request.send(data);
  });
}

/**
* Perform an asynchronous request
*
* @param {String} method - the method like "GET" or "POST"
* @param {String} url - the targeted url
* @param {FormData} data - Optionnal, the data to be send
* @param {Boolean} waitingMessage - Optionnal, whether to display or not
* a waiting message while the request is proceeded
* @return {Promise} response
*/
function xhrequest(method, url, data, waitingMessage) {
  if (waitingMessage) {
    document.getElementById('overlay').style.display = '';
  }
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    _app.xhr_to_cancel = request;
    request.open(method, url, true);
    request.onload = (resp) => {
      resolve(resp.target.responseText);
      _app.xhr_to_cancel = undefined;
      if (waitingMessage) {
        document.getElementById('overlay').style.display = 'none';
      }
    };
    request.onerror = (err) => {
      reject(err);
      _app.xhr_to_cancel = undefined;
      if (waitingMessage) {
        document.getElementById('overlay').style.display = 'none';
      }
    };
    request.send(data);
  });
}

function getImgDataUrl(url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => { resolve(reader.result); };
      reader.readAsDataURL(request.response);
    };
    request.onerror = (err) => { reject(err); };
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.send();
  });
}

function make_content_summary(serie, precision = 6) {
  return [
    i18next.t('app_page.stat_summary.population'), ' : ', round_value(serie.pop(), precision), '<br>',
    i18next.t('app_page.stat_summary.min'), ' : ', round_value(serie.min(), precision), ' | ',
    i18next.t('app_page.stat_summary.max'), ' : ', round_value(serie.max(), precision), '<br>',
    i18next.t('app_page.stat_summary.mean'), ' : ', round_value(serie.mean(), precision), '<br>',
    i18next.t('app_page.stat_summary.median'), ' : ', round_value(serie.median(), precision), '<br>',
    i18next.t('app_page.stat_summary.variance'), ' : ', round_value(serie.variance(), precision), '<br>',
    i18next.t('app_page.stat_summary.stddev'), ' : ', round_value(serie.stddev(), precision), '<br>',
    i18next.t('app_page.stat_summary.cov'), ' : ', round_value(serie.cov(), precision),
  ].join('');
}

function copy_layer(ref_layer, new_name, type_result, fields_to_copy) {
  const id_new_layer = encodeId(new_name);
  const id_ref_layer = _app.layer_to_id.get(ref_layer);
  const node_ref_layer = svg_map.querySelector(`#${id_ref_layer}`);
  _app.layer_to_id.set(new_name, id_new_layer);
  _app.id_to_layer.set(id_new_layer, new_name);
  svg_map.appendChild(node_ref_layer.cloneNode(true));
  svg_map.lastChild.setAttribute('id', id_new_layer);
  const node_new_layer = document.getElementById(id_new_layer);
  svg_map.insertBefore(node_new_layer, svg_map.querySelector('.legend'));
  result_data[new_name] = [];
  current_layers[new_name] = {
    n_features: current_layers[ref_layer].n_features,
    type: current_layers[ref_layer].type,
    ref_layer_name: ref_layer,
  };
  if (current_layers[ref_layer].pointRadius) {
    current_layers[new_name].pointRadius = current_layers[ref_layer].pointRadius;
  }
  const selec_src = node_ref_layer.getElementsByTagName('path'),
    selec_dest = node_new_layer.getElementsByTagName('path');
  if (!fields_to_copy) {
    for (let i = 0; i < selec_src.length; i++) {
      selec_dest[i].__data__ = selec_src[i].__data__;
      result_data[new_name].push(selec_dest[i].__data__.properties);
    }
  } else {
    for (let i = 0; i < selec_src.length; i++) {
      selec_dest[i].__data__ = { type: 'Feature', properties: {}, geometry: cloneObj(selec_src[i].__data__.geometry) };
      const nb_field_to_copy = fields_to_copy.length;
      for (let j = 0; j < nb_field_to_copy; j++) {
        const f = fields_to_copy[j];
        selec_dest[i].__data__.properties[f] = selec_src[i].__data__.properties[f];
      }
      result_data[new_name].push(selec_dest[i].__data__.properties);
    }
  }
  // Set the desired class name :
  node_new_layer.classList = ['layer'];
  // Reset visibility and filter attributes to default values:
  node_new_layer.style.visibility = '';
  node_new_layer.removeAttribute('filter');
  // Create an entry in the layer manager:
  create_li_layer_elem(new_name, current_layers[new_name].n_features, [current_layers[new_name].type, type_result], 'result');
}

/**
* Send a geo result layer computed client-side (currently only discontinuities)
* to the server in order to use it as other result layers computed server side
* @param {string} layerName - The name of the layer to send
* @param {string} url - The url to use
* @return {undefined}
*/
function send_layer_server(layerName, url) {
  const JSON_layer = path_to_geojson(layerName);
  const formToSend = new FormData();
  formToSend.append('geojson', JSON_layer);
  formToSend.append('layer_name', layerName);
  xhrequest('POST', url, formToSend, false).then((e) => {
    current_layers[layerName].key_name = JSON.parse(e).key;
  }).catch((err) => {
    display_error_during_computation();
    console.log(err);
  });
}

/**
* Function returning the name of all current layers (excepted the sample layers used as layout)
*
* @return {Array} - The name of the other layers in an Array
*/
function get_other_layer_names() {
  const otherLayers = Object.getOwnPropertyNames(current_layers);
  let tmpIdx = null;

  tmpIdx = otherLayers.indexOf('Graticule');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  tmpIdx = otherLayers.indexOf('World');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  tmpIdx = otherLayers.indexOf('Sphere');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  return otherLayers;
}

/**
* Function triggered in order to add a new layer
* in the "layer manager" (with appropriates icons regarding to its type, etc.)
* @param {string} layerName - The name of the new layer
* @param {integer} nbFt - The number of feature in this layer
* @param {string} typeGeom - The geometry type
* @param {string} typeLayer - Whether it is a result layer or not
* @return {undefined}
*/
function create_li_layer_elem(layerName, nbFt, typeGeom, typeLayer) {
  const listDisplayName = get_display_name_on_layer_list(layerName);
  const layerId = encodeId(layerName);
  const layersListed = layer_list.node();
  const li = document.createElement('li');

  li.setAttribute('layer_name', layerName);
  if (typeLayer === 'result') {
    li.setAttribute('class', ['sortable_result ', layerId].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layerName, "</b> - ", typeGeom[0] ," - ", nbFt, " features"].join(''));
    li.innerHTML = [listDisplayName, '<div class="layer_buttons">',
      button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_legend,
      button_result_type.get(typeGeom[1]), '</div> '].join('');
  } else if (typeLayer === 'sample') {
    li.setAttribute('class', ['sortable ', layerId].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layerName, "</b> - Sample layout layer"].join(''));
    li.innerHTML = [listDisplayName, '<div class="layer_buttons">',
      button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0,
      button_type.get(typeGeom), '</div> '].join('');
  }
  layersListed.insertBefore(li, layersListed.childNodes[0]);
  binds_layers_buttons(layerName);
}

/**
* Function returning an object describing the type of field
* @param {string} layerName - The name of the new layer
* @param {string} target - The geometry type
* @return {object|array} - An object containing the type of each field if
* target was nos specified, otherwise an array of field name corresponding
* to the type defined in 'target'.
*/
const type_col = function type_col(layerName, target) {
// Function returning an object like {"field1": "field_type", "field2": "field_type"},
//  for the fields of the selected layer.
// If target is set to "number" it should return an array containing only the name of the numerical fields
// ------------------- "string" ---------------------------------------------------------non-numerial ----
  const table = user_data.hasOwnProperty(layerName) ? user_data[layerName]
                  : result_data.hasOwnProperty(layerName) ? result_data[layerName]
                  : joined_dataset[0];
  const fields = Object.getOwnPropertyNames(table[0]);
  const nbFeatures = table.length;
  const deepthTest = nbFeatures > 100 ? 100 : nbFeatures - 1;
  const result = {};
  let field;
  let tmpType;

  for (let j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    result[field] = [];
    for (let i = 0; i < deepthTest; ++i) {
      tmpType = typeof table[i][field];
      if (tmpType === 'string' && table[i][field].length === 0) {
        tmpType = 'empty';
      } else if (tmpType === 'string' && !isNaN(Number(table[i][field]))) {
        tmpType = 'number';
      } else if (tmpType === 'object' && isFinite(table[i][field])) {
        tmpType = 'empty';
      }
      result[fields[j]].push(tmpType);
    }
  }

  for (let j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    if (result[field].every(ft => ft === 'number' || ft === 'empty')
          && result[field].indexOf('number') > -1) {
      result[field] = 'number';
    } else {
      result[field] = 'string';
    }
  }
  if (target) {
    const res = [];
    Object.keys(result).forEach((k) => {
      if (result[k] === target && k !== '_uid') {
        res.push(k);
      }
    });
    return res;
  }
  return result;
};

const type_col2 = function type_col2(table, _field, skip_if_empty_values = false) {
// Function returning an object like {"field1": "field_type", "field2": "field_type"},
//  for the fields of the selected layer.
  const result = [];
  const nbFeatures = table.length;
  const tmp = {};
  const dups = {};
  let field = _field;
  let tmpType;
  let fields;

  if (!field) {
    fields = Object.getOwnPropertyNames(table[0]).filter(v => v !== '_uid');
    field = undefined;
  } else {
    fields = [field];
    field = undefined;
  }

  for (let j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    tmp[field] = [];
    dups[field] = false;
    const h = {};
    for (let i = 0; i < nbFeatures; ++i) {
      const val = table[i][field];
      if (h[val]) dups[field] = true;
      else h[val] = true;
      tmpType = typeof val;
      if (tmpType === 'object' && isFinite(val)) {
        tmpType = 'empty';
      } else if (tmpType === 'string' && val.length === 0) {
        tmpType = 'empty';
      } else if ((tmpType === 'string' && !isNaN(Number(val))) || tmpType === 'number') {
        const _val = Number(table[i][field]);
        tmpType = (_val | 0) === val ? 'stock' : 'ratio';
      }
      tmp[fields[j]].push(tmpType);
    }
  }
  for (let j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    const hasDup = dups[field];
    if (field.toLowerCase() === 'id' && !hasDup) {
      result.push({ name: field, type: 'id', has_duplicate: hasDup });
    } else if (tmp[field].every(ft => ft === 'stock' || ft === 'empty') && tmp[field].indexOf('stock') > -1) {
      result.push({ name: field, type: 'stock', has_duplicate: hasDup });
    } else if (tmp[field].every(ft => ft === 'string' || ft === 'empty') && tmp[field].indexOf('string') > -1) {
      result.push({ name: field, type: 'category', has_duplicate: hasDup });
    } else if (tmp[field].every(ft => ft === 'ratio' || ft === 'stock' || ft === 'empty') && tmp[field].indexOf('ratio') > -1) {
      result.push({ name: field, type: 'ratio' });
    } else {
      result.push({ name: field, type: 'unknown', has_duplicate: hasDup });
    }
  }
  return result;
};

const getFieldsType = function getFieldsType(type, layerName, ref) {
  if (!layerName && !ref) return null;
  const refField = ref || current_layers[layerName].fields_type;
  return refField.filter(d => d.type === type).map(d => d.name);
};

function make_box_type_fields(layerName) {
  make_dialog_container(
      'box_type_fields',
      i18next.t('app_page.box_type_fields.title'),
      'dialog');
  d3.select('#box_type_fields').select('modal-dialog').style('width', '400px');
  const newbox = d3.select('#box_type_fields').select('.modal-body');
  const tmp = type_col2(user_data[layerName]);
  let fields_type = current_layers[layerName].fields_type;
  const f = fields_type.map(v => v.name);
  const refType = ['id', 'stock', 'ratio', 'category', 'unknown'];

  const deferred = Promise.pending();
  const container = document.getElementById('box_type_fields');

  const clean_up_box = () => {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', helper_esc_key_twbs);
  };

  if (f.length === 0) { // If the user dont have already selected the type :
    fields_type = tmp.slice();
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    const _onclose = () => {  // Or use the default values if he use the X  close button
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('#xclose').onclick = _onclose;
  } else if (tmp.length > fields_type.length) {
    // There is already types selected but new fields where added
    tmp.forEach((d) => {
      if (f.indexOf(d.name) === -1) { fields_type.push(d); }
    });
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    const _onclose = () => {  // Or use the default values if he use the X  close button
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('#xclose').onclick = _onclose;
  } else { // There is already types selected and no new fields (so this is a modification) :
    // Use the previous values if the user close
    // the window without confirmation (cancel or X button)
    const _onclose = () => {
      current_layers[layerName].fields_type = fields_type;
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('.btn_cancel').onclick = _onclose;
    container.querySelector('#xclose').onclick = _onclose;
  }

  // Fetch and store the selected values when 'Ok' button is clicked :
  container.querySelector('.btn_ok').onclick = function () {
    const r = [];
    Array.prototype.forEach.call(
          document.getElementById('fields_select').getElementsByTagName('p'),
          (elem) => {
            r.push({ name: elem.childNodes[0].innerHTML.trim(), type: elem.childNodes[1].value });
          });
    deferred.resolve(true);
    current_layers[layerName].fields_type = r.slice();
    getAvailablesFunctionnalities(layerName);
    if (window.fields_handler) {
      fields_handler.unfill();
      fields_handler.fill(layerName);
    }
    clean_up_box();
  };
  function helper_esc_key_twbs(_evt) {
    const evt = _evt || window.event;
    const isEscape = ('key' in evt) ? (evt.key === 'Escape' || evt.key === 'Esc') : (evt.keyCode === 27);
    if (isEscape) {
      evt.stopPropagation();
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    }
  }
  document.addEventListener('keydown', helper_esc_key_twbs);
  document.getElementById('btn_type_fields').removeAttribute('disabled');

  newbox.append('h3').html(i18next.t('app_page.box_type_fields.message_invite'));

  const box_select = newbox.append('div')
    .attr('id', 'fields_select');

  box_select.selectAll('p')
      .data(fields_type)
      .enter()
      .append('p')
      .style('margin', '15px');

  box_select.selectAll('p')
    .insert('span')
    .html(d => d.name);

  box_select.selectAll('p')
    .insert('select')
    .style('float', 'right')
    .selectAll('option')
    .data(refType)
    .enter()
    .insert('option')
    .attr('value', d => d)
    .text(d => i18next.t(`app_page.box_type_fields.${d}`))
    .exit();

  box_select.selectAll('select')
    .each(function (d) {
      this.value = d.type;
    });

  for (let i = 0; i < fields_type.length; i++) {
    if (fields_type[i].type === 'category' || fields_type[i].not_number) {
      box_select.node().childNodes[i].childNodes[1].options.remove(2);
      box_select.node().childNodes[i].childNodes[1].options.remove(1);
    }
    if (fields_type[i].has_duplicate) {
      box_select.node().childNodes[i].childNodes[1].options.remove(0);
    }
  }
  overlay_under_modal.display();
  setTimeout((_) => { container.querySelector('button.btn_ok').focus(); }, 400);
  return deferred.promise;
}

function getAvailablesFunctionnalities(layerName) {
  const fields_stock = getFieldsType('stock', layerName),
    fields_ratio = getFieldsType('ratio', layerName),
    fields_categ = getFieldsType('category', layerName),
    section = document.getElementById('section2_pre');
  let func_stock,
    func_ratio,
    func_categ;
  if (current_layers[layerName].type === 'Line') {  // Layer type is Line
    const elems = section.querySelectorAll('#button_grid, #button_discont, #button_smooth, #button_cartogram, #button_typosymbol, #button_flow');
    for (let i = 0, len_i = elems.length; i < len_i; i++) {
      elems[i].style.filter = 'grayscale(100%)';
    }
    func_stock = section.querySelectorAll('#button_prop');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo');
  } else if (current_layers[layerName].type === 'Point') {  // layer type is Point
    const elems = section.querySelectorAll('#button_grid, #button_discont, #button_cartogram');
    for (let i = 0, len_i = elems.length; i < len_i; i++) {
      elems[i].style.filter = 'grayscale(100%)';
    }
    func_stock = section.querySelectorAll('#button_smooth, #button_prop');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
  } else {  // Layer type is Polygon
    func_stock = section.querySelectorAll('#button_smooth, #button_prop, #button_grid, #button_cartogram, #button_discont');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop, #button_discont');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
  }
  if (fields_stock.length === 0) {
    Array.prototype.forEach.call(func_stock, d => d.style.filter = 'grayscale(100%)');
  } else {
    Array.prototype.forEach.call(func_stock, d => d.style.filter = 'invert(0%) saturate(100%)');
  }
  if (fields_ratio.length === 0) {
    Array.prototype.forEach.call(func_ratio, d => d.style.filter = 'grayscale(100%)');
  } else {
    Array.prototype.forEach.call(func_ratio, d => d.style.filter = 'invert(0%) saturate(100%)');
  }
  if (fields_categ.length === 0) {
    Array.prototype.forEach.call(func_categ, d => d.style.filter = 'grayscale(100%)');
  } else {
    Array.prototype.forEach.call(func_categ, d => d.style.filter = 'invert(0%) saturate(100%)');
  }
  if (fields_stock.length === 0 || fields_ratio.length === 0) {
    document.getElementById('button_choroprop').style.filter = 'grayscale(100%)';
  } else {
    document.getElementById('button_choroprop').style.filter = 'invert(0%) saturate(100%)';
  }
  if (fields_stock.length === 0 || fields_categ.length === 0) {
    document.getElementById('button_proptypo').style.filter = 'grayscale(100%)';
  } else {
    document.getElementById('button_proptypo').style.fiter = 'invert(0%) saturate(100%)';
  }
}

const clickLinkFromDataUrl = function clickLinkFromDataUrl(url, filename) {
  return fetch(url)
    .then(res => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute('href', blobUrl);
      dlAnchorElem.setAttribute('download', filename);
      // if (window.isIE || window.isOldMS_Firefox) {
      if (window.isIE) {
        swal({
          title: '',
          html: `<div class="link_download"><p>${i18next.t('app_page.common.download_link')}</p></div>`,
          showCancelButton: true,
          showConfirmButton: false,
          allowEscapeKey: false,
          allowOutsideClick: false,
          cancelButtonText: i18next.t('app_page.common.close'),
          animation: 'slide-from-top',
          onOpen() {
            dlAnchorElem.innerHTML = filename;
            const content = document.getElementsByClassName('link_download')[0];
            content.appendChild(dlAnchorElem);
          },
          onClose() {
            URL.revokeObjectURL(blobUrl);
          },
        }).then(inputValue => null,
            dismissValue => null);
      } else {
        dlAnchorElem.style.display = 'none';
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        dlAnchorElem.remove();
        URL.revokeObjectURL(blobUrl);
      }
    });
};

const helper_esc_key_twbs_cb = function helper_esc_key_twbs_cb(_event, callback) {
  const evt = _event || window.event;
  const isEscape = ('key' in evt) ? (evt.key === 'Escape' || evt.key === 'Esc') : (evt.keyCode === 27);
  if (isEscape) {
    evt.stopPropagation();
    if (callback) {
      callback();
    }
  }
};

const cloneObj = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  else if (obj.toString() === '[object Map]') return new Map(obj.entries());
  return Object.assign({}, obj);
};

function change_layer_name(old_name, new_name) {
  const old_id = _app.layer_to_id.get(old_name);
  const new_id = encodeId(new_name);
  current_layers[new_name] = cloneObj(current_layers[old_name]);
  delete current_layers[old_name];
  const list_elem = document.querySelector(`li.${old_id}`);
  list_elem.classList.remove(old_id);
  list_elem.classList.add(new_id);
  list_elem.setAttribute('layer_name', new_name);
  list_elem.innerHTML = list_elem.innerHTML.replace(old_name, new_name);
  const b = svg_map.querySelector(`#${old_id}`);
  b.id = new_id;
  const lgd_elem = document.querySelector(`g[layer_name="${old_name}"]`);
  if (lgd_elem) {
    lgd_elem.setAttribute('layer_name', new_name);
    lgd_elem.classList.remove(`lgdf_${old_id}`);
    lgd_elem.classList.add(`lgdf_${new_id}`);
  }
  if (Object.getOwnPropertyNames(result_data).indexOf(old_name) > -1) {
    result_data[new_name] = [].concat(result_data[old_name]);
    delete result_data[old_name];
  }
  if (Object.getOwnPropertyNames(user_data).indexOf(old_name) > -1) {
    user_data[new_name] = [].concat(user_data[old_name]);
    delete user_data[old_name];
  }
  if (current_layers[new_name].targeted) {
    const name_section1 = document.getElementById('section1').querySelector('#input_geom');
    name_section1.innerHTML = name_section1.innerHTML.replace(old_name, new_name);
    if (window.fields_handler) {
      window.fields_handler.unfill();
      window.fields_handler.fill(new_name);
    }
  }
  if (_app.current_functionnality && _app.current_functionnality.name === 'smooth') {
    const mask_layers = document.querySelectorAll('select#stewart_mask > option');
    for (let i = 0; i < mask_layers.length; i++) {
      if (mask_layers[i].value === old_name) {
        mask_layers[i].value = new_name;
        mask_layers[i].innerHTML = new_name;
      }
    }
  }
  const other_layers = Object.getOwnPropertyNames(current_layers);
  for (let i = 0; i < other_layers.length; i++) {
    if (current_layers[other_layers[i]].ref_layer_name === old_name) {
      current_layers[other_layers[i]].ref_layer_name = new_name;
    }
  }
  const select_export_lyr = document.getElementById('section5').querySelectorAll('#layer_to_export > option');
  for (let i = 0; i < select_export_lyr.length; i++) {
    if (select_export_lyr[i].value === old_name) {
      select_export_lyr[i].value = new_name;
      select_export_lyr[i].innerHTML = new_name;
    }
  }
  _app.layer_to_id.set(new_name, new_id);
  _app.id_to_layer.set(new_id, new_name);
  _app.layer_to_id.delete(old_name);
  _app.id_to_layer.delete(old_id);
  binds_layers_buttons(new_name);
}
