"use strict";

var drag_elem_geo = d3.drag()
   .subject(function() {
          var t = d3.select(this);
          return {
              x: t.attr("x"), y: t.attr("y"),
              map_locked: map_div.select("#hand_button").classed("locked") ? true : false
          };
      })
  .on("start", () => {
      d3.event.sourceEvent.stopPropagation();
      d3.event.sourceEvent.preventDefault();
      handle_click_hand("lock");
    })
  .on("end", () => {
    if(d3.event.subject && !d3.event.subject.map_locked)
      handle_click_hand("unlock");
    })
  .on("drag", function(){
      d3.select(this).attr("x", d3.event.x).attr("y", d3.event.y);
    });


function setSelected(selectNode, value){
    selectNode.value = value;
    selectNode.dispatchEvent(new Event('change'));
}

// Function to be called after clicking on "render" in order to close the section 2
// and to have the section 3 opened
function switch_accordion_section(id_elem){
    id_elem = id_elem || 'btn_s3';
    document.getElementById(id_elem).dispatchEvent(new MouseEvent("click"));
}

function path_to_geojson(layer_name){
    let id_layer = ["#", _app.layer_to_id.get(layer_name)].join('');
    var result_geojson = [];
    d3.select(id_layer)
        .selectAll("path")
        .each(function(d,i){
            result_geojson.push({
                type: "Feature",
                id: i,
                properties: d.properties,
                geometry: {type: d.type, coordinates: d.coordinates}
            });
        });
    return JSON.stringify({
        type: "FeatureCollection",
        crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        features: result_geojson
    });
}

function display_error_during_computation(msg){
    msg = msg ? ["<br><i>", i18next.t("app_page.common.details"), ":</i> ", msg].join("") : "";
    swal({title: i18next.t("app_page.common.error") + "!",
          text: i18next.t("app_page.common.error_message") + msg,
          customClass: 'swal2_custom',
          type: "error",
          allowOutsideClick: false});
}

/**
* Perform an asynchronous request
*
* @param {String} method - the method like "GET" or "POST"
* @param {String} url - the targeted url
* @param {FormData} data - Optionnal, the data to be send
* @return {Promise} response
*/
function request_data(method, url, data){
    return new Promise(function(resolve, reject){
        var request = new XMLHttpRequest();
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
* @param {Boolean} wainting_message - Optionnal, whether to display or not a waiting message while the request is proceeded
* @return {Promise} response
*/
function xhrequest(method, url, data, waiting_message){
    if(waiting_message){ document.getElementById("overlay").style.display = ""; }
    return new Promise(function(resolve, reject){
        var request = new XMLHttpRequest();
        _app.xhr_to_cancel = request;
        request.open(method, url, true);
        request.onload = resp => {
            resolve(resp.target.responseText);
            _app.xhr_to_cancel = undefined;
            if(waiting_message){ document.getElementById("overlay").style.display = "none"; }
        };
        request.onerror = err => {
            reject(err);
            _app.xhr_to_cancel = undefined;
            if(waiting_message){ document.getElementById("overlay").style.display = "none"; }
        };
        request.send(data);
    });
}

function getImgDataUrl(url){
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.onload = () => {
        let reader = new FileReader();
        reader.onloadend = () => { resolve(reader.result); };
        reader.readAsDataURL(request.response);
    };
    request.onerror = (err) => { reject(err); };
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.send();
  });
}

function make_content_summary(serie, precision=6){
    return [
        i18next.t("app_page.stat_summary.population"), " : ", round_value(serie.pop(), precision), "<br>",
        i18next.t("app_page.stat_summary.min"), " : ", round_value(serie.min(), precision), " | ",
        i18next.t("app_page.stat_summary.max"), " : ", round_value(serie.max(), precision), "<br>",
        i18next.t("app_page.stat_summary.mean"), " : ", round_value(serie.mean(), precision), "<br>",
        i18next.t("app_page.stat_summary.median"), " : ", round_value(serie.median(), precision), "<br>",
        i18next.t("app_page.stat_summary.variance"), " : ", round_value(serie.variance(), precision), "<br>",
        i18next.t("app_page.stat_summary.stddev"), " : ", round_value(serie.stddev(), precision), "<br>",
        i18next.t("app_page.stat_summary.cov"), " : ", round_value(serie.cov(), precision)
    ].join('')
}

function copy_layer(ref_layer, new_name, type_result, fields_to_copy){
  const id_new_layer = encodeId(new_name);
  const id_ref_layer = _app.layer_to_id.get(ref_layer);
  let node_ref_layer = svg_map.querySelector("#"+id_ref_layer);
  _app.layer_to_id.set(new_name, id_new_layer);
  _app.id_to_layer.set(id_new_layer, new_name);
  svg_map.appendChild(node_ref_layer.cloneNode(true));
  svg_map.lastChild.setAttribute("id", id_new_layer);
  let node_new_layer = document.getElementById(id_new_layer);
  svg_map.insertBefore(node_new_layer, svg_map.querySelector('.legend'));
  node_new_layer.setAttribute("class", "result_layer layer");
  result_data[new_name] = [];
  current_layers[new_name] = {
    n_features: current_layers[ref_layer].n_features,
    type: current_layers[ref_layer].type,
    ref_layer_name: ref_layer
  };
  if(current_layers[ref_layer].pointRadius) {
    current_layers[new_name].pointRadius = current_layers[ref_layer].pointRadius;
  }
  let selec_src = node_ref_layer.getElementsByTagName("path"),
      selec_dest = node_new_layer.getElementsByTagName("path");
  if(!fields_to_copy){
    for(let i = 0; i < selec_src.length; i++){
      selec_dest[i].__data__ = selec_src[i].__data__;
      result_data[new_name].push(selec_dest[i].__data__.properties);
    }
  } else {
    for(let i = 0; i < selec_src.length; i++){
      selec_dest[i].__data__ = {type: "Feature", properties: {}, geometry: cloneObj(selec_src[i].__data__.geometry)};
      for(let f of fields_to_copy){
          selec_dest[i].__data__.properties[f] = selec_src[i].__data__.properties[f]
      }
      result_data[new_name].push(selec_dest[i].__data__.properties);
    }
  }
  // Reset visibility and filter attributes to default values:
  node_new_layer.style.visibility = "";
  node_new_layer.removeAttribute('filter');
  // Create an entry in the layer manager:
  create_li_layer_elem(new_name, current_layers[new_name].n_features, [current_layers[new_name].type, type_result], "result");
}

/**
* Send a geo result layer computed client-side (currently only discontinuities)
* to the server in order to use it as other result layers computed server side
* @param {string} layerName - The name of the layer to send
* @param {string} url - The url to use
* @return {undefined}
*/
function send_layer_server(layerName, url){
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
function get_other_layer_names(){
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
* function triggered in order to add a new layer
* in the "layer manager" (with appropriates icons regarding to its type, etc.)
*
* @return {undefined}
*/
function create_li_layer_elem(layer_name, nb_ft, type_geom, type_layer){
  let _list_display_name = get_display_name_on_layer_list(layer_name),
      layer_id = encodeId(layer_name),
      layers_listed = layer_list.node(),
      li = document.createElement("li");

  li.setAttribute("layer_name", layer_name);
  if (type_layer == "result") {
    li.setAttribute("class", ["sortable_result ", layer_id].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layer_name, "</b> - ", type_geom[0] ," - ", nb_ft, " features"].join(''));
    li.innerHTML = [_list_display_name, '<div class="layer_buttons">',
                    button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_legend,
                    button_result_type.get(type_geom[1]), "</div> "].join('');
  } else if (type_layer === "sample") {
    li.setAttribute("class", ["sortable ", layer_id].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layer_name, "</b> - Sample layout layer"].join(''));
    li.innerHTML = [_list_display_name, '<div class="layer_buttons">',
                    button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0,
                    button_type.get(type_geom), "</div> "].join('');
  }
  layers_listed.insertBefore(li, layers_listed.childNodes[0]);
  binds_layers_buttons(layer_name);
}

const type_col = function type_col(layer_name, target){
// Function returning an object like {"field1": "field_type", "field2": "field_type"},
//  for the fields of the selected layer.
// If target is set to "number" it should return an array containing only the name of the numerical fields
// ------------------- "string" ---------------------------------------------------------non-numerial ----
  const table = user_data.hasOwnProperty(layer_name) ? user_data[layer_name]
                  : result_data.hasOwnProperty(layer_name) ? result_data[layer_name]
                  : joined_dataset[0];
  const fields = Object.getOwnPropertyNames(table[0]);
  const nbFeatures = table.length;
  const deepthTest = 100 < nbFeatures ? 100 : nbFeatures - 1;
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
    let res = [];
    for (let k in result) {
      if (result[k] === target && k !== '_uid') {
        res.push(k);
      }
    }
    return res;
  }
  return result;
};

const type_col2 = function type_col2(table, _field, skip_if_empty_values=false){
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
    let h = {};
    for (let i = 0; i < nbFeatures; ++i) {
      let val = table[i][field];
      if (h[val]) dups[field] = true;
      else h[val] = true;
      tmpType = typeof val;
      if (tmpType === 'object' && isFinite(val)) {
        tmpType = 'empty';
      } else if(tmpType === 'string' && val.length == 0) {
        tmpType = 'empty';
      } else if ((tmpType === 'string' && !isNaN(Number(val))) || tmpType === 'number') {
        let _val = Number(table[i][field]);
        tmpType = (_val | 0) == val ? 'stock' : 'ratio';
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

function make_box_type_fields(layer_name) {
  make_dialog_container(
      "box_type_fields",
      i18next.t("app_page.box_type_fields.title"),
      "dialog");
  d3.select('#box_type_fields').select('modal-dialog').style('width', '400px');
  const newbox = d3.select("#box_type_fields").select(".modal-body");
  const tmp = type_col2(user_data[layer_name]);
  let fields_type = current_layers[layer_name].fields_type;
  const f = fields_type.map(v => v.name);
  const refType = ['id', 'stock', 'ratio', 'category', 'unknown'];

  const deferred = Promise.pending();
  const container = document.getElementById("box_type_fields");

  const clean_up_box = () => {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', helper_esc_key_twbs);
  };

  if (f.length === 0) { // If the user dont have already selected the type :
    fields_type = tmp.slice();
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    let _onclose = () => {  // Or use the default values if he use the X  close button
        current_layers[layer_name].fields_type = tmp.slice();
        getAvailablesFunctionnalities(layer_name);
        deferred.resolve(false);
        clean_up_box();
    };
    container.querySelector("#xclose").onclick = _onclose;
  } else if (tmp.length > fields_type.length) {
    // There is already types selected but new fields where added
    tmp.forEach(d => {
      if(f.indexOf(d.name) === -1)
        fields_type.push(d);
      });
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    let _onclose = () => {  // Or use the default values if he use the X  close button
      current_layers[layer_name].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layer_name);
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector("#xclose").onclick = _onclose;
  } else { // There is already types selected and no new fields (so this is a modification) :
      // Use the previous values if the user close the window without confirmation (cancel or X button)
      let _onclose = () => {
        current_layers[layer_name].fields_type = fields_type;
        deferred.resolve(false);
        clean_up_box();
      };
      container.querySelector(".btn_cancel").onclick = _onclose;
      container.querySelector("#xclose").onclick = _onclose;
  }

  // Fetch and store the selected values when 'Ok' button is clicked :
  container.querySelector(".btn_ok").onclick = function(){
      let r = [];
      Array.prototype.forEach.call(
          document.getElementById('fields_select').getElementsByTagName('p'),
          elem => {
            r.push({name: elem.childNodes[0].innerHTML.trim(), type: elem.childNodes[1].value})
          });
      deferred.resolve(true);
      current_layers[layer_name].fields_type = r.slice();
      getAvailablesFunctionnalities(layer_name);
      if(window.fields_handler){
          fields_handler.unfill();
          fields_handler.fill(layer_name);
      }
      clean_up_box();
  }
  function helper_esc_key_twbs(evt){
    evt = evt || window.event;
    let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
    if (isEscape) {
      evt.stopPropagation();
      current_layers[layer_name].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layer_name);
      deferred.resolve(false);
      clean_up_box();
    }
  }
  document.addEventListener('keydown', helper_esc_key_twbs);
  document.getElementById('btn_type_fields').removeAttribute('disabled');

  newbox.append("h3").html(i18next.t("app_page.box_type_fields.message_invite"));

  let box_select = newbox.append('div')
    .attr('id', 'fields_select');

  box_select.selectAll("p")
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
      .text(d => i18next.t('app_page.box_type_fields.' + d))
      .exit();

  box_select.selectAll('select')
      .each(function(d) {
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
  setTimeout(_ => { container.querySelector('button.btn_ok').focus(); }, 400);
  return deferred.promise;
};

function getAvailablesFunctionnalities(layer_name){
    let fields_stock = getFieldsType('stock', layer_name),
        fields_ratio = getFieldsType('ratio', layer_name),
        fields_categ = getFieldsType('category', layer_name),
        section = document.getElementById('section2_pre');

    if(current_layers[layer_name].type == "Line"){  // Layer type is Line
        let elems = section.querySelectorAll('#button_grid, #button_discont, #button_smooth, #button_cartogram, #button_typosymbol, #button_flow');
        for(let i = 0, len_i = elems.length; i < len_i; i++){
            elems[i].style.filter = "grayscale(100%)";
        }
        var func_stock = section.querySelectorAll('#button_prop'),
            func_ratio = section.querySelectorAll('#button_choro, #button_choroprop'),
            func_categ = section.querySelectorAll('#button_typo, #button_proptypo');
    } else if (current_layers[layer_name].type == "Point"){  // layer type is Point
        let elems = section.querySelectorAll('#button_grid, #button_discont, #button_cartogram');
        for(let i = 0, len_i = elems.length; i < len_i; i++){
            elems[i].style.filter = "grayscale(100%)";
        }
        var func_stock = section.querySelectorAll('#button_smooth, #button_prop'),
            func_ratio = section.querySelectorAll('#button_choro, #button_choroprop'),
            func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
    } else {  // Layer type is Polygon
        var func_stock = section.querySelectorAll('#button_smooth, #button_prop, #button_grid, #button_cartogram, #button_discont'),
            func_ratio = section.querySelectorAll('#button_choro, #button_choroprop, #button_discont'),
            func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
    }
    if(fields_stock.length === 0){
        Array.prototype.forEach.call(func_stock, d => d.style.filter = "grayscale(100%)");
    } else {
        Array.prototype.forEach.call(func_stock, d => d.style.filter = "invert(0%) saturate(100%)");
    }
    if(fields_ratio.length === 0){
        Array.prototype.forEach.call(func_ratio, d => d.style.filter = "grayscale(100%)");
    } else {
        Array.prototype.forEach.call(func_ratio, d => d.style.filter = "invert(0%) saturate(100%)");
    }
    if(fields_categ.length === 0){
        Array.prototype.forEach.call(func_categ, d => d.style.filter = "grayscale(100%)");
    } else {
        Array.prototype.forEach.call(func_categ, d => d.style.filter = "invert(0%) saturate(100%)");
    }
    if(fields_stock.length === 0 || fields_ratio.length === 0){
        document.getElementById('button_choroprop').style.filter = "grayscale(100%)";
    } else {
        document.getElementById('button_choroprop').style.filter = "invert(0%) saturate(100%)";
    }
    if(fields_stock.length === 0 || fields_categ.length === 0){
        document.getElementById('button_proptypo').style.filter = "grayscale(100%)";
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
          title: "",
          html: '<div class="link_download"><p>' + i18next.t('app_page.common.download_link') + '</p></div>',
          showCancelButton: true,
          showConfirmButton: false,
          allowEscapeKey: false,
          allowOutsideClick: false,
          cancelButtonText: i18next.t('app_page.common.close'),
          animation: "slide-from-top",
          onOpen: function() {
              dlAnchorElem.innerHTML = filename;
              let content = document.getElementsByClassName('link_download')[0];
              content.appendChild(dlAnchorElem);
          },
          onClose: function() {
            URL.revokeObjectURL(blobUrl);
          }
        }).then(inputValue => { null; },
            dismissValue => { null; });
      } else {
        dlAnchorElem.style.display = 'none';
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        dlAnchorElem.remove();
        URL.revokeObjectURL(blobUrl);
      }
  });
}

const helper_esc_key_twbs_cb = function helper_esc_key_twbs_cb(evt, callback){
  evt = evt || window.event;
  let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
  if (isEscape) {
    evt.stopPropagation();
    if(callback){
        callback();
    }
  }
}
