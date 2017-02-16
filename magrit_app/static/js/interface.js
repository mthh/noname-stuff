"use strict";
////////////////////////////////////////////////////////////////////////
// Browse and upload buttons + related actions (conversion + displaying)
////////////////////////////////////////////////////////////////////////
const MAX_INPUT_SIZE = 20200000; // max allowed input size in bytes
// const ALERT_INPUT_SIZE = 870400; // If the input is larger than this size, the user will receive an alert
/**
* Function triggered when some images of the interface are clicked
* in order to create an <input> element, simulate a click on it, let the user
* browse its file and dispatch the files to the appropriate handler according
* to the file type
*/
function click_button_add_layer(){
    var res = [],
        self = this,
        input = document.createElement('input');

    let target_layer_on_add = false;

    if(self.id == "img_data_ext" || self.id == "data_ext"){
        input.setAttribute("accept", ".xls,.xlsx,.csv,.tsv,.ods,.txt");
        target_layer_on_add = true;
    } else if (self.id === "input_geom" || self.id === "input_geom") {
        input.setAttribute("accept", ".kml,.geojson,.topojson,.shp,.dbf,.shx,.prj,.cpg");
        target_layer_on_add = true;
    } else if (self.id == "input_layout_geom") {
        input.setAttribute("accept", ".kml,.geojson,.topojson,.shp,.dbf,.shx,.prj,.cpg");
    }
    input.setAttribute('type', 'file');
    input.setAttribute('multiple', '');
    input.setAttribute('name', 'file[]');
    input.setAttribute('enctype', 'multipart/form-data');
    input.onchange = function(event){

        let files = event.target.files;

        handle_upload_files(files, target_layer_on_add, self);
    };

    input.dispatchEvent(new MouseEvent("click"))
}

function handle_upload_files(files, target_layer_on_add, elem){

    for(let i=0; i < files.length; i++){
        if(files[i].size > MAX_INPUT_SIZE){
            // elem.style.border = '3px dashed red';
            elem.style.border = '';
            return swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t("app_page.common.too_large_input"),
                  type: "error",
                  customClass: 'swal2_custom',
                  allowEscapeKey: false,
                  allowOutsideClick: false});
        }
    }

    if(!(files.length == 1)){
        var files_to_send = [];
        Array.prototype.forEach.call(files, f =>
            f.name.indexOf('.shp') > -1
                || f.name.indexOf('.dbf') > -1
                || f.name.indexOf('.shx') > -1
                || f.name.indexOf('.prj') > -1
                ? files_to_send.push(f) : null)
        elem.style.border = '';
        if(target_layer_on_add && _app.targeted_layer_added){
                swal({title: i18next.t("app_page.common.error") + "!",
                      text: i18next.t('app_page.common.error_only_one'),
                      customClass: 'swal2_custom',
                      type: "error",
                      allowEscapeKey: false,
                      allowOutsideClick: false});
        } else if(files_to_send.length == 4){
            handle_shapefile(files_to_send, target_layer_on_add);
            elem.style.border = '';
        } else {
            // elem.style.border = '3px dashed red';
            elem.style.border = '';
            return swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t("app_page.common.alert_upload1"),
                  customClass: 'swal2_custom',
                  type: "error",
                  allowEscapeKey: false,
                  allowOutsideClick: false});
        }
    }
    else if(files[0].name.toLowerCase().indexOf('topojson') > -1){
           elem.style.border = '';
           if(target_layer_on_add && _app.targeted_layer_added)
                swal({title: i18next.t("app_page.common.error") + "!",
                      text: i18next.t('app_page.common.error_only_one'),
                      customClass: 'swal2_custom',
                      type: "error",
                      allowEscapeKey: false,
                      allowOutsideClick: false});
           // Most direct way to add a layer :
           else handle_TopoJSON_files(files, target_layer_on_add);
   }
   else if(files[0].name.toLowerCase().indexOf('geojson') > -1 ||
        files[0].name.toLowerCase().indexOf('zip') > -1 ||
        files[0].name.toLowerCase().indexOf('gml') > -1 ||
        files[0].name.toLowerCase().indexOf('kml') > -1){
           elem.style.border = '';

           if(target_layer_on_add && _app.targeted_layer_added)
                swal({title: i18next.t("app_page.common.error") + "!",
                      text: i18next.t('app_page.common.error_only_one'),
                      customClass: 'swal2_custom',
                      type: "error",
                      allowEscapeKey: false,
                      allowOutsideClick: false});
           // Send the file to the server for conversion :
           else handle_single_file(files[0], target_layer_on_add);
   }
  else if(files[0].name.toLowerCase().indexOf('.csv')  > -1
    || files[0].name.toLowerCase().indexOf('.tsv')  > -1) {
        elem.style.border = '';
        if(target_layer_on_add)
            handle_dataset(files[0], target_layer_on_add);
        else
            swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t('app_page.common.error_only_layout'),
                  type: "error",
                  customClass: 'swal2_custom',
                  allowEscapeKey: false,
                  allowOutsideClick: false});
   }
  else if(files[0].name.toLowerCase().indexOf('.xls')  > -1
    || files[0].name.toLowerCase().indexOf('.ods')  > -1) {
        elem.style.border = '';
        if(target_layer_on_add)
            convert_dataset(files[0]);
        else
            swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t('app_page.common.error_only_layout'),
                  type: "error",
                  customClass: 'swal2_custom',
                  allowEscapeKey: false,
                  allowOutsideClick: false});
   }
  else {
        elem.style.border = '';
        let shp_part;
        Array.prototype.forEach.call(files, f =>
            f.name.indexOf('.shp') > -1
                || f.name.indexOf('.dbf') > -1
                || f.name.indexOf('.shx') > -1
                || f.name.indexOf('.prj') > -1
                ? shp_part = true : null);
        if(shp_part){
            return swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t('app_page.common.alert_upload_shp'),
                  type: "error",
                  customClass: 'swal2_custom',
                  allowOutsideClick: false,
                  allowEscapeKey: false}).then(valid => { null; }, dismiss => { null; });
        } else {
            return swal({title: i18next.t("app_page.common.error") + "!",
                  text: i18next.t('app_page.common.alert_upload_invalid'),
                  type: "error",
                  customClass: 'swal2_custom',
                  allowOutsideClick: false,
                  allowEscapeKey: false});
        }
    }
}

function handleOneByOneShp(files, target_layer_on_add){
    function populate_shp_slot(slots, file){
        if(file.name.indexOf(".shp") > -1){
            slots.set(".shp", file)
            document.getElementById("f_shp").className = "mini_button_ok";
        } else if (file.name.indexOf(".shx") > -1){
            slots.set(".shx", file)
            document.getElementById("f_shx").className = "mini_button_ok";
        } else if (file.name.indexOf(".prj") > -1){
            slots.set(".prj", file)
            document.getElementById("f_prj").className = "mini_button_ok";
        } else if (file.name.indexOf(".dbf") > -1){
            slots.set(".dbf", file)
            document.getElementById("f_dbf").className = "mini_button_ok";
        } else
            return false
    }

    swal({
        title: "",
        html: '<div style="border: dashed 1px green;border-radius: 1%;" id="dv_drop_shp">' +
              '<strong>Shapefile detected - Missing files to upload</strong><br>' +
              '<p><i>Drop missing files in this area</i></p><br>' +
              '<image id="img_drop" src="/static/img/Ic_file_download_48px.svg"><br>' +
              '<p id="f_shp" class="mini_button_none">.shp</p>' + '<p id="f_shx" class="mini_button_none">.shx</p>' +
              '<p id="f_dbf" class="mini_button_none">.dbf</p>' + '<p id="f_prj" class="mini_button_none">.prj</p>' + '</div>',
        type: "info",
        showCancelButton: true,
        showCloseButton: false,
        allowEscapeKey: true,
        allowOutsideClick: false,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: i18next.t("app_page.common.confirm"),
        preConfirm: function() {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (shp_slots.size < 4) {
                        reject('Missing files')
                    } else {
                        resolve()
                    }
                }, 50)
            })
        }
      }).then( value => {
          let file_list = [shp_slots.get(".shp"), shp_slots.get(".shx"), shp_slots.get(".dbf"), shp_slots.get(".prj")];
          for(let i=0; i < file_list.length; i++){
              if(file_list[i].size > MAX_INPUT_SIZE){
                  overlay_drop.style.display = "none";
                  return swal({title: i18next.t("app_page.common.error") + "!",
                        text: i18next.t("app_page.common.too_large_input"),
                        type: "error",
                        allowEscapeKey: false,
                        allowOutsideClick: false});
              }
          }

          if(target_layer_on_add){
              handle_shapefile(file_list, target_layer_on_add);
          } else {
              let opts = _app.targeted_layer_added
                        ? {'layout': i18next.t("app_page.common.layout_l") }
                        : { 'target': i18next.t("app_page.common.target_l"), 'layout': i18next.t("app_page.common.layout_l") };
              swal({
                  title: "",
                  text: i18next.t("app_page.common.layer_type_selection"),
                  type: "info",
                  showCancelButton: true,
                  showCloseButton: false,
                  allowEscapeKey: true,
                  allowOutsideClick: false,
                  confirmButtonColor: "#DD6B55",
                  confirmButtonText: i18next.t("app_page.common.confirm"),
                  input: 'select',
                  inputPlaceholder: i18next.t("app_page.common.layer_type_selection"),
                  inputOptions: opts,
                  inputValidator: function(value) {
                      return new Promise(function(resolve, reject){
                          if(value.indexOf('target') < 0 && value.indexOf('layout') < 0){
                              reject(i18next.t("app_page.common.no_value"));
                          } else {
                              resolve();
                              // let file_list = [shp_slots.get(".shp"), shp_slots.get(".shx"), shp_slots.get(".dbf"), shp_slots.get(".prj")];
                              handle_shapefile(file_list, value === "target");
                          }
                      })
                  }
                }).then( value => {
                      overlay_drop.style.display = "none";
                  }, dismiss => {
                      overlay_drop.style.display = "none";
                      console.log(dismiss);
                  });
          }
        }, dismiss => {
            overlay_drop.style.display = "none";
            console.log(dismiss);
        });
    let shp_slots = new Map();
    populate_shp_slot(shp_slots, files[0]);
    document.getElementById("dv_drop_shp").addEventListener("drop", function(event){
        event.preventDefault(); event.stopPropagation();
        let next_files = event.dataTransfer.files;
        for(let f_ix=0; f_ix < next_files.length; f_ix++){
            let file = next_files[f_ix];
            populate_shp_slot(shp_slots, file);
        }
        if(shp_slots.size == 4){
            document.getElementById("dv_drop_shp").innerHTML = document.getElementById("dv_drop_shp").innerHTML.replace('Ic_file_download_48px.svg', 'Ic_check_36px.svg')
        }
    })
    document.getElementById("dv_drop_shp").addEventListener("dragover", function(event){
        this.style.border = "dashed 2.5px green";
        event.preventDefault(); event.stopPropagation();
    });
    document.getElementById("dv_drop_shp").addEventListener("dragleave", function(event){
        this.style.border = "dashed 1px green";
        event.preventDefault(); event.stopPropagation();
    });
}

/**
* Function called to bind the "drop zone" on the 2 desired menu elements
*
*/
function prepare_drop_section(){
    var timeout;
    Array.prototype.forEach.call(
        document.querySelectorAll("#map,.overlay_drop"),
        function(elem){
            elem.addEventListener("dragenter", e => {
                e.preventDefault(); e.stopPropagation();
                if(document.body.classList.contains("no-drop"))
                    return;
                let overlay_drop = document.getElementById("overlay_drop");
                overlay_drop.style.display = "";
            });

            elem.addEventListener("dragover", e => {
                e.preventDefault(); e.stopPropagation();
                if(document.body.classList.contains("no-drop"))
                    return;
                if(timeout){
                    clearTimeout(timeout);
                    timeout = setTimeout(function(){
                        let overlay_drop = document.getElementById("overlay_drop");
                        e.preventDefault(); e.stopPropagation();
                        overlay_drop.style.display = "none";
                        timeout = null;
                    }, 2500);
                }
            });

            elem.addEventListener("dragleave", e => {
                e.preventDefault(); e.stopPropagation();
                if(document.body.classList.contains("no-drop")){
                    document.body.classList.remove("no-drop");
                    return;
                }
                timeout = setTimeout(function(){
                    let overlay_drop = document.getElementById("overlay_drop");
                    overlay_drop.style.display = "none";
                    timeout = null;
                }, 2500);
            });

            elem.addEventListener("drop", function _drop_func(e){
                e.preventDefault(); e.stopPropagation();
                if(timeout){
                    clearTimeout(timeout);
                }
                if(document.body.classList.contains("no-drop") || !e.dataTransfer.files.length){
                    document.getElementById("overlay_drop").style.display = "none";
                    return;
                }
                let overlay_drop = document.getElementById("overlay_drop");
                overlay_drop.style.display = "";
                let files = e.dataTransfer.files;
                if(files.length == 1
                        && (files[0].name.indexOf(".shp") > -1
                           || files[0].name.indexOf(".shx") > -1
                           || files[0].name.indexOf(".dbf") > -1
                           || files[0].name.indexOf(".prj") > -1)){
                    Array.prototype.forEach.call(document.querySelectorAll("#map,.overlay_drop"), _elem => {
                        _elem.removeEventListener('drop', _drop_func);
                    });
                    handleOneByOneShp(files);
                } else {
                    let opts;
                    if(files[0].name.indexOf(".csv") > -1 || files[0].name.indexOf(".tsv") > -1 || files[0].name.indexOf(".txt") > -1
                            || files[0].name.indexOf(".xls") > -1 || files[0].name.indexOf(".xlsx") > -1 || files[0].name.indexOf(".ods") > -1 ){
                        opts = { 'target': i18next.t("app_page.common.ext_dataset")}
                    } else {
                        opts = _app.targeted_layer_added
                              ? {'layout': i18next.t("app_page.common.layout_l") }
                              : { 'target': i18next.t("app_page.common.target_l"), 'layout': i18next.t("app_page.common.layout_l") };
                    }
                    swal({
                        title: "",
                        text: i18next.t("app_page.common.layer_type_selection"),
                        type: "info",
                        showCancelButton: true,
                        showCloseButton: false,
                        allowEscapeKey: true,
                        allowOutsideClick: false,
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: i18next.t("app_page.common.confirm"),
                        input: 'select',
                        inputPlaceholder: i18next.t("app_page.common.layer_type_selection"),
                        inputOptions: opts,
                        inputValidator: function(value) {
                            return new Promise(function(resolve, reject){
                                if(value.indexOf('target') < 0 && value.indexOf('layout') < 0){
                                    reject(i18next.t("app_page.common.no_value"));
                                } else {
                                    // resolve();
                                    // handle_upload_files(files, value === "target", elem);
                                    resolve(handle_upload_files(files, value === "target", elem));
                                }
                            })
                        }
                      }).then( value => {
                            overlay_drop.style.display = "none";
                            console.log(value);
                        }, dismiss => {
                            overlay_drop.style.display = "none";
                            console.log(dismiss);
                        });
                }
            });
    });

    Array.prototype.forEach.call(
        document.querySelectorAll("#section1,#section3"),
        function(elem){
            elem.addEventListener("dragenter", function(e){
                e.preventDefault();
                e.stopPropagation();
                if(document.body.classList.contains("no-drop"))
                    return;
                elem.style.border = '3px dashed green';
            });
            elem.addEventListener("dragover", function(e){
                e.preventDefault();
                e.stopPropagation();
                if(document.body.classList.contains("no-drop"))
                    return;
                elem.style.border = '3px dashed green';
            });
            elem.addEventListener("dragleave", function(e){
                e.preventDefault();
                e.stopPropagation();
                elem.style.border = '';
                if(document.body.classList.contains("no-drop"))
                    document.body.classList.remove("no-drop");
            });
            elem.addEventListener("drop", function(e) {
                e.preventDefault();
                e.stopPropagation();
                if(!e.dataTransfer.files.length){
                    elem.style.border = '';
                    return;
                }
                let files = e.dataTransfer.files,
                    target_layer_on_add = elem.id === "section1" ? true : false;
                if(files.length == 1
                        && (files[0].name.indexOf(".shp") > -1
                           || files[0].name.indexOf(".shx") > -1
                           || files[0].name.indexOf(".dbf") > -1
                           || files[0].name.indexOf(".prj") > -1)){
                    handleOneByOneShp(files, target_layer_on_add);
                } else {
                    handle_upload_files(files, target_layer_on_add, elem);
                }
            }, true);
    });

}

function ask_replace_dataset(){
    return swal({
        title: "",
        text: i18next.t("app_page.common.ask_replace_dataset"),
        type: "warning",
        showCancelButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: i18next.t("app_page.common.confirm")
      });
}

function convert_dataset(file){
    let do_convert = () => {
        var ajaxData = new FormData();
        ajaxData.append("action", "submit_form");
        ajaxData.append('file[]', file);
        xhrequest("POST", '/convert_tabular', ajaxData, true)
            .then(data => {
                data = JSON.parse(data);
                dataset_name = data.name;
                swal({title: "",
                      text: i18next.t('app_page.common.warn_xls_sheet') + (data.message ? '\n' + i18next.t(data.message[0], {sheet_name: data.message[1][0]}) : ''),
                      type: "info",
                      allowOutsideClick: false,
                      allowEscapeKey: false
                    }).then(() => {
                        add_dataset(d3.csvParse(data.file));
                    }, dismiss => { null; });
            }, error => {
                display_error_during_computation();
            });
    };

    if(joined_dataset.length !== 0){
        ask_replace_dataset().then(_ => {
                remove_ext_dataset_cleanup();
                do_convert();
            }, _ => { null; });
    } else {
      do_convert();
    }
}

function handle_shapefile(files, target_layer_on_add){
    var ajaxData = new FormData();
    ajaxData.append("action", "submit_form");
    for(let j=0; j<files.length; j++){
        ajaxData.append('file['+j+']', files[j]);
    }
    xhrequest("POST", '/convert_to_topojson', ajaxData, true)
        .then(data => {
            add_layer_topojson(data, {target_layer_on_add: target_layer_on_add});
        }, error => {
            display_error_during_computation();
        });
}


function handle_TopoJSON_files(files, target_layer_on_add) {
    var f = files[0],
        name = files[0].name,
        reader = new FileReader(),
        ajaxData = new FormData();
    ajaxData.append('file[]', f);
    xhrequest("POST", '/cache_topojson/user', ajaxData, false)
        .then(res => {
            let key = JSON.parse(res).key;
            reader.onloadend = function(){
                let text = reader.result;
                let topoObjText = ['{"key": ', key, ',"file":', text, '}'].join('');
                add_layer_topojson(topoObjText, {target_layer_on_add: target_layer_on_add});
                }
            reader.readAsText(f);
        }, error => {
            display_error_during_computation();
        });
};


function handle_reload_TopoJSON(text, param_add_func){
    var ajaxData = new FormData();
    var f = new Blob([text], {type: "application/json"});
    ajaxData.append('file[]', f);

    return xhrequest("POST", '/cache_topojson/user', ajaxData, false).then(function(response){
        let res = response,
            key = JSON.parse(res).key,
            topoObjText = ['{"key": ', key, ',"file":', text, '}'].join('');
        let layer_name = add_layer_topojson(topoObjText, param_add_func);
        return layer_name;
    });
}

//var UTF8 = {
//    encode: function(s){
//        for(let c, i = -1, l = (s = s.split("")).length, o = String.fromCharCode; ++i < l;
//            s[i] = (c = s[i].charCodeAt(0)) >= 127 ? o(0xc0 | (c >>> 6)) + o(0x80 | (c & 0x3f)) : s[i]
//		);
//		return s.join("");
//    },
//    decode: function(s){
//        for(let a, b, i = -1, l = (s = s.split("")).length, o = String.fromCharCode, c = "charCodeAt"; ++i < l;
//            ((a = s[i][c](0)) & 0x80) &&
//            (s[i] = (a & 0xfc) == 0xc0 && ((b = s[i + 1][c](0)) & 0xc0) == 0x80 ?
//            o(((a & 0x03) << 6) + (b & 0x3f)) : o(128), s[++i] = "")
//            );
//		return s.join("");
//	}
//};

/**
* Handle a csv dataset by parsing it as an array of Object (ie features) or by
* converting it to topojson if it contains valid x/y/lat/lon/etc. columns and
* adding it to the map
* @param {File} f - The input csv file
*/
function handle_dataset(f, target_layer_on_add){

    function check_dataset(){
        var reader = new FileReader(),
            name = f.name;

        reader.onload = function(e) {
            var data = e.target.result;
            dataset_name = name.substring(0, name.indexOf('.csv'));
            let sep = data.split("\n")[0];
            if(sep.indexOf("\t") > -1) {
                sep = "\t";
            } else if (sep.indexOf(";") > -1){
                sep = ";";
            } else {
                sep = ",";
            }
//            let encoding = jschardet.detect(data);
//            if(encoding.encoding != "utf-8"
//                    || encoding.confidence){
//                console.log(encoding);
//                // Todo : do something in order to get a correct encoding
//            }
            let tmp_dataset = d3.dsvFormat(sep).parse(data);
            let field_name = Object.getOwnPropertyNames(tmp_dataset[0]);
            if(field_name.indexOf("x") > -1 || field_name.indexOf("X") > -1 || field_name.indexOf("lat") > -1 || field_name.indexOf("latitude") > -1){
                if(field_name.indexOf("y") > -1 || field_name.indexOf("Y") > -1 || field_name.indexOf("lon") > -1 || field_name.indexOf("longitude") > -1 || field_name.indexOf("long") > -1){
                    if(target_layer_on_add && _app.targeted_layer_added){
                        swal({title: i18next.t("app_page.common.error") + "!",
                              text: i18next.t('app_page.common.error_only_one'),
                              customClass: 'swal2_custom',
                              type: "error",
                              allowEscapeKey: false,
                              allowOutsideClick: false});

                    } else {
                        add_csv_geom(data, dataset_name);
                    }
                    return;
                }
            }
            add_dataset(tmp_dataset);
        };
        reader.readAsText(f);
    }

    if(joined_dataset.length !== 0){
        ask_replace_dataset().then(() => {
            remove_ext_dataset_cleanup();
            check_dataset();
          }, () => { null; });
    } else {
        check_dataset();
    }
}

function update_menu_dataset(){
    let d_name = dataset_name.length > 20 ? [dataset_name.substring(0, 17), "(...)"].join('') : dataset_name,
        nb_features = joined_dataset[0].length,
        field_names = Object.getOwnPropertyNames(joined_dataset[0][0]);

    let data_ext = document.getElementById("data_ext");

    d3.select(data_ext.parentElement.firstChild)
        .attrs({"id": "img_data_ext",
               "class": "user_panel",
               "src": "/static/img/b/tabular.svg",
               "width": "26", "height": "26",
               "alt": "Additional dataset"});

    data_ext.classList.remove('i18n');
    data_ext.removeAttribute('data-i18n');
    d3.select(data_ext)
        .html([' <b>', d_name, '</b> - <i><span style="font-size:9px;">',
               nb_features, ' ', i18next.t("app_page.common.feature", {count: +nb_features}), ' - ',
               field_names.length, ' ', i18next.t("app_page.common.field", {count: +field_names.length}),
               '</i></span>'].join(''));
    data_ext.parentElement.innerHTML = data_ext.parentElement.innerHTML + '<img width="13" height="13" src="/static/img/Trash_font_awesome.png" id="remove_dataset" style="float:right;margin-top:10px;opacity:0.5">';

    document.getElementById("remove_dataset").onclick = () => {
        remove_ext_dataset()
    };
    document.getElementById("remove_dataset").onmouseover = function(){
        this.style.opacity = 1;
    };
    document.getElementById("remove_dataset").onmouseout = function(){
        this.style.opacity = 0.5;
    };
    if(_app.targeted_layer_added){
        valid_join_check_display(false);
    }
}


/**
*
*
*/
function add_dataset(readed_dataset){
    // Check if their is an empty name in the columns name (typically the first one) and replace it by UID:
    if(readed_dataset[0].hasOwnProperty('')){
        let new_col_name = !readed_dataset[0].hasOwnProperty('UID') ? 'UID' :'Undefined_Name';
        for(let i = 0; i < readed_dataset.length; ++i){
            readed_dataset[i][new_col_name] = readed_dataset[i]['']
            delete readed_dataset[i][''];
        }
    }

    let cols = Object.getOwnPropertyNames(readed_dataset[0]);

    // Test if there is an empty last line and remove it if its the case :
    if(cols.map(f => readed_dataset[readed_dataset.length - 1][f]).every(f => f == "")){
        readed_dataset = readed_dataset.slice(0, readed_dataset.length - 1);
    }

    // Suboptimal way to convert an eventual comma decimal separator to a point decimal separator :
    for(let i = 0; i < cols.length; i++){
        let tmp = [];
        // Check that all values of this field can be coerced to Number :
        for(let j=0; j < readed_dataset.length; j++){
            if((readed_dataset[j][cols[i]].replace &&
                    (!isNaN(+readed_dataset[j][cols[i]].replace(",", ".")) || !isNaN(+readed_dataset[j][cols[i]].split(' ').join(''))))
                 || !isNaN(+readed_dataset[j][cols[i]])) {
                // Add the converted value to temporary field if its ok ...
                let t_val = readed_dataset[j][cols[i]].replace(",", ".").split(' ').join('');
                tmp.push(isFinite(t_val) && t_val != "" && t_val != null ? +t_val : t_val);
            } else {
                // Or break early if a value can't be coerced :
                break; // So no value of this field will be converted
            }
        }
        // If the whole field has been converted successfully, apply the modification :
        if(tmp.length === readed_dataset.length){
            for(let j=0; j < readed_dataset.length; j++){
                readed_dataset[j][cols[i]] = tmp[j];
            }
        }
    }
    joined_dataset.push(readed_dataset);

    update_menu_dataset();

    if(_app.current_functionnality && _app.current_functionnality.name == "flow")
        fields_handler.fill();

    if(_app.targeted_layer_added){
        let layer_name = Object.getOwnPropertyNames(user_data)[0];
        ask_join_now(layer_name, 'dataset');
    }
}

function add_csv_geom(file, name){
    var ajaxData = new FormData();
    ajaxData.append('filename', name);
    ajaxData.append('csv_file', file);
    xhrequest("POST", '/convert_csv_geo', ajaxData, true)
        .then( data => {
            dataset_name = undefined;
            add_layer_topojson(data, {target_layer_on_add: true});
        }, error => {
            display_error_during_computation();
        });
}

/**
* Send a single file (.zip / .kml / .gml / .geojson) to the server in order to get
* the converted layer added to the map
* @param {File} file
*/
function handle_single_file(file, target_layer_on_add) {
    var ajaxData = new FormData();
    ajaxData.append("action", "single_file");
    ajaxData.append('file[]', file);
    xhrequest("POST", '/convert_to_topojson', ajaxData, true)
        .then( data => {
            add_layer_topojson(data, {target_layer_on_add: target_layer_on_add});
        }, error => {
            display_error_during_computation();
        });
};

function get_display_name_on_layer_list(layer_name_to_add){
    return +layer_name_to_add.length > 40
        ? [layer_name_to_add.substring(0, 37), '(...)'].join('')
        : layer_name_to_add;
}

function ask_join_now(layer_name, on_add='layer'){
  swal({title: "",
        text: i18next.t("app_page.join_box.before_join_ask"),
        allowOutsideClick: false,
        allowEscapeKey: true,
        type: "question",
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: i18next.t("app_page.common.yes"),
        cancelButtonText: i18next.t("app_page.common.no"),
      }).then(() => {
          createJoinBox(layer_name);
      }, dismiss => {
          if(on_add == 'layer') make_box_type_fields(layer_name);
      });
}

function ask_existing_feature(feature_name){
  return swal({
    title: "",
    text: i18next.t('app_page.common.error_existing_' + feature_name),
    allowOutsideClick: false,
    allowEscapeKey: false,
    type: "question",
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText: i18next.t("app_page.common.yes"),
    cancelButtonText: i18next.t("app_page.common.no"),
  });
}

// Add the TopoJSON to the 'svg' element :
function add_layer_topojson(text, options){

    var parsedJSON = JSON.parse(text);
    var result_layer_on_add = (options && options.result_layer_on_add) ? true : false,
        target_layer_on_add = (options && options.target_layer_on_add) ? true : false,
        skip_alert = (options && options.skip_alert) ? true : false,
        fields_type = (options && options.fields_type) ? options.fields_type : undefined;

    if(parsedJSON.Error){  // Server returns a JSON reponse like {"Error":"The error"} if something went bad during the conversion
        display_error_during_computation(parsedJSON.Error);
        return;
    }
    var type = "",
        topoObj = parsedJSON.file,
        data_to_load = false,
        layers_names = Object.getOwnPropertyNames(topoObj.objects);

    if(layers_names.length > 1){
        swal("", i18next.t("app_page.common.warning_multiple_layers"), "warning");
    }

    var random_color1 = ColorsSelected.random(),
        lyr_name = layers_names[0],
        lyr_name_to_add = check_layer_name(options && options.choosed_name ? options.choosed_name : lyr_name),
        lyr_id = encodeId(lyr_name_to_add),
        skip_rescale = (options && options.skip_rescale) ? skip_rescale : false;

    _app.layer_to_id.set(lyr_name_to_add, lyr_id);
    _app.id_to_layer.set(lyr_id, lyr_name_to_add);

    let nb_ft = topoObj.objects[lyr_name].geometries.length,
        topoObj_objects = topoObj.objects[lyr_name];

    if(!topoObj_objects.geometries || topoObj_objects.geometries.length == 0){
        display_error_during_computation(i18next.t('app_page.common.error_invalid_empty'));
        return;
    }

    let field_names = topoObj_objects.geometries[0].properties ? Object.getOwnPropertyNames(topoObj_objects.geometries[0].properties) : [];

    if(topoObj_objects.geometries[0].type.indexOf('Point') > -1) type = 'Point';
    else if(topoObj_objects.geometries[0].type.indexOf('LineString') > -1) type = 'Line';
    else if(topoObj_objects.geometries[0].type.indexOf('Polygon') > -1) type = 'Polygon';

    current_layers[lyr_name_to_add] = {
        "type": type,
        "n_features": nb_ft,
        "stroke-width-const": 0.4,
        "fill_color":  {"single": random_color1},
        "key_name": parsedJSON.key
        };

    if(target_layer_on_add){
        current_layers[lyr_name_to_add].targeted = true;
        user_data[lyr_name_to_add] = [];
        data_to_load = true;
        current_layers[lyr_name_to_add].fields_type = [];
    } else if(result_layer_on_add){
        result_data[lyr_name_to_add] = [];
        current_layers[lyr_name_to_add].is_result = true;
    }

    svg_layers.append("g").attr("id", lyr_id)
        .attr("class", data_to_load ? "targeted_layer layer" : "layer")
        .styles({"stroke-linecap": "round", "stroke-linejoin": "round"})
        .selectAll(".subunit")
        .data(topojson.feature(topoObj, topoObj_objects).features)
        .enter().append("path")
        .attrs({"d": path, "height": "100%", "width": "100%"})
        .attr("id", function(d, ix) {
              if(data_to_load){
                  if(field_names.length > 0){
                      if(d.id != undefined && d.id != ix){
                          d.properties["_uid"] = d.id;
                          d.id = +ix;
                      }
                      user_data[lyr_name_to_add].push(d.properties);
                  } else {
                      user_data[lyr_name_to_add].push({"id": d.id || ix});
                  }
              } else if(result_layer_on_add)
                  result_data[lyr_name_to_add].push(d.properties);

              return "feature_" + ix;
          })
        .styles({"stroke": type != 'Line' ? "rgb(0, 0, 0)" : random_color1,
                 "stroke-opacity": 1,
                 "fill": type != 'Line' ? random_color1 : null,
                 "fill-opacity": type != 'Line' ? 0.90 : 0});

    let class_name = [
        target_layer_on_add ? "sortable_target " : result_layer_on_add ? "sortable_result " : null,
        lyr_id
        ].join('');

    let layers_listed = layer_list.node(),
        li = document.createElement("li"),
        nb_fields = field_names.length,
        _lyr_name_display_menu = get_display_name_on_layer_list(lyr_name_to_add);

    li.setAttribute("class", class_name);
    li.setAttribute("layer_name", lyr_name_to_add);
    d3.select('#layer_to_export').append('option').attr('value', lyr_name_to_add).text(lyr_name_to_add);
    if(target_layer_on_add){
        current_layers[lyr_name_to_add].original_fields = new Set(Object.getOwnPropertyNames(user_data[lyr_name_to_add][0]));

        if(joined_dataset.length != 0){
            valid_join_check_display(false); console.log(section1.select(".s1"));
            section1.select(".s1").html("").on("click", null);
        }

        document.getElementById('sample_zone').style.display = "none";

        let _button = button_type.get(type),
            nb_fields = field_names.length,
            nb_char_display = lyr_name_to_add.length + nb_fields.toString().length + nb_ft.toString().length,
            _lyr_name_display = +nb_char_display > 23 ? [lyr_name_to_add.substring(0, 18), '(...)'].join('') : lyr_name_to_add;

        _button = _button.substring(10, _button.indexOf("class") - 2);
        let _input_geom = document.getElementById("input_geom");
        _input_geom.classList.remove('i18n');
        _input_geom.removeAttribute('data-i18n');
        d3.select(_input_geom)
            .attrs({"src": _button, "width": "26", "height": "26"})
            .html(['<b>', _lyr_name_display, '</b> - <i><span style="font-size:9px;">',
                   nb_ft, ' ', i18next.t("app_page.common.feature", {count: +nb_ft}), ' - ',
                   nb_fields, ' ', i18next.t("app_page.common.field", {count: +nb_fields}),
                   '</i></span>'].join(''))
            .on("click", null);
        _input_geom.parentElement.innerHTML = _input_geom.parentElement.innerHTML + '<img width="13" height="13" src="/static/img/Trash_font_awesome.png" id="remove_target" style="float:right;margin-top:10px;opacity:0.5">';
        let remove_target = document.getElementById("remove_target");
        remove_target.onclick = () => { remove_layer(lyr_name_to_add); };
        remove_target.onmouseover = function(){ this.style.opacity = 1; };
        remove_target.onmouseout = function(){ this.style.opacity = 0.5; };
        _app.targeted_layer_added = true;
        li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_type.get(type), "</div>"].join('')

        window._target_layer_file = topoObj;
        if(!skip_rescale){
            scale_to_lyr(lyr_name_to_add);
            center_map(lyr_name_to_add);
        }
        handle_click_hand("lock");
        if(_app.current_functionnality != undefined)
            fields_handler.fill(lyr_name_to_add);
    } else if (result_layer_on_add) {
        li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_legend, button_result_type.get(options.func_name ? options.func_name : _app.current_functionnality.name), "</div>"].join('');
        if(!skip_rescale){
            center_map(lyr_name_to_add);
        }
        handle_click_hand("lock");
    } else {
        li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_type.get(type), "</div>"].join('')
    }

    if (!target_layer_on_add && _app.current_functionnality != undefined && _app.current_functionnality.name == "smooth"){
        fields_handler.fill();
    }

    if(!result_layer_on_add && type === "Point"){
        current_layers[lyr_name_to_add].pointRadius = path.pointRadius();
    }

    layers_listed.insertBefore(li, layers_listed.childNodes[0])
    // up_legends();
    handleClipPath(current_proj_name);
    binds_layers_buttons(lyr_name_to_add);
    if(!skip_rescale){
      zoom_without_redraw();
    }

    if(!skip_alert){
        if(fields_type != undefined){
            current_layers[lyr_name_to_add].fields_type = fields_type;
        }
        swal({title: "",
              text: i18next.t("app_page.common.layer_success"),
              allowOutsideClick: true,
              allowEscapeKey: true,
              type: "success"
            }).then(() => {
                if(target_layer_on_add && joined_dataset.length > 0)
                    ask_join_now(lyr_name_to_add);
                else if (target_layer_on_add)
                    make_box_type_fields(lyr_name_to_add);
            }, dismiss => {
                if(target_layer_on_add && joined_dataset.length > 0)
                    ask_join_now(lyr_name_to_add);
                else if (target_layer_on_add)
                    make_box_type_fields(lyr_name_to_add);
            });
    }
    return lyr_name_to_add;
};

/**
* Change the projection scale and translate properties in order to fit the layer.
* Redraw the path from all the current layers to reflect the change.
*
* @param {string} name - The name of layer to scale on
*/
function scale_to_lyr(name){
    var symbol = current_layers[name].symbol || "path",
        bbox_layer_path = undefined;
    svg_layers.select("#"+_app.layer_to_id.get(name)).selectAll(symbol).each( (d,i) => {
        var bbox_path = path.bounds(d);
        if(bbox_layer_path === undefined){
            bbox_layer_path = bbox_path;
        }
        else {
            bbox_layer_path[0][0] = bbox_path[0][0] < bbox_layer_path[0][0] ? bbox_path[0][0] : bbox_layer_path[0][0];
            bbox_layer_path[0][1] = bbox_path[0][1] < bbox_layer_path[0][1] ? bbox_path[0][1] : bbox_layer_path[0][1];
            bbox_layer_path[1][0] = bbox_path[1][0] > bbox_layer_path[1][0] ? bbox_path[1][0] : bbox_layer_path[1][0];
            bbox_layer_path[1][1] = bbox_path[1][1] > bbox_layer_path[1][1] ? bbox_path[1][1] : bbox_layer_path[1][1];
        }
    });
    s = 0.95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h) * proj.scale();
    t = [0, 0];
    proj.scale(s).translate(t);
    svg_layers.selectAll(".layer").selectAll("path").attr("d", path);
    reproj_symbol_layer();
};

/**
* Center and zoom to a layer (using zoom scale and translate properties).
* Projection properties stay unchanged.
*
* @param {string} name - The name of layer to zoom on
*/
function center_map(name){
    var symbol = current_layers[name].symbol || "path",
        bbox_layer_path = undefined;
    svg_layers.select("#" + _app.layer_to_id.get(name)).selectAll(symbol).each(function(d, i){
        let bbox_path = path.bounds(d);
        if(!bbox_layer_path)
            bbox_layer_path = bbox_path;
        else {
            bbox_layer_path[0][0] = bbox_path[0][0] < bbox_layer_path[0][0] ? bbox_path[0][0] : bbox_layer_path[0][0];
            bbox_layer_path[0][1] = bbox_path[0][1] < bbox_layer_path[0][1] ? bbox_path[0][1] : bbox_layer_path[0][1];
            bbox_layer_path[1][0] = bbox_path[1][0] > bbox_layer_path[1][0] ? bbox_path[1][0] : bbox_layer_path[1][0];
            bbox_layer_path[1][1] = bbox_path[1][1] > bbox_layer_path[1][1] ? bbox_path[1][1] : bbox_layer_path[1][1];
        }
    });
    let zoom_scale = .95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h);
    let zoom_translate = [(w - zoom_scale * (bbox_layer_path[1][0] + bbox_layer_path[0][0])) / 2, (h - zoom_scale * (bbox_layer_path[1][1] + bbox_layer_path[0][1])) / 2];
    let _zoom = svg_map.__zoom;
    _zoom.k = zoom_scale;
    _zoom.x = zoom_translate[0];
    _zoom.y = zoom_translate[1];
};


function setSphereBottom(){
    let layers_list = document.querySelector(".layer_list");
    layers_list.appendChild(layers_list.childNodes[0]);
    let layers = svg_layers.node();
    layers.insertBefore(layers.querySelector('#Sphere'), layers.childNodes[0]);
 }


function add_layout_feature(selected_feature, options = {}){
    if(selected_feature == "text_annot"){
        let existing_annotation = document.getElementsByClassName("txt_annot"),
            existing_id = [],
            new_id;
        if(existing_annotation)
            existing_id = Array.prototype.map.call(
                            existing_annotation,
                            elem => +elem.childNodes[0].id.split('text_annotation_')[1]
                            );
        for(let i=0; i < 50; i++){
            if(existing_id.indexOf(i) == -1){
                existing_id.push(i);
                new_id = ["text_annotation_", i].join('');
                break;
            } else continue;
        }
        if(!(new_id)){
            swal(i18next.t("app_page.common.error") + "!", i18next.t("app_page.common.error_max_text_annot"), "error");
            return;
        }
        handleClickTextBox(new_id);
    } else if (selected_feature == "sphere"){
        if(current_layers.Sphere) return;
        options.fill = options.fill || "#add8e6";
        options.fill_opacity = options.fill_opacity || 0.2;
        options.stroke_width = options.stroke_width || "0.5px";
        options.stroke_opacity = options.stroke_opacity || 1;
        options.stroke = options.stroke || "#ffffff";
        current_layers["Sphere"] = {"type": "Polygon", "n_features":1, "stroke-width-const": +options.stroke_width.slice(0,-2), "fill_color" : {single: options.fill}};
        svg_layers.append("g")
            .attrs({id: "Sphere", class: "layer"})
            .styles({'stroke-width': options.stroke_width})
            .append("path")
            .datum({type: "Sphere"})
            .styles({fill: options.fill, "fill-opacity": options.fill_opacity, 'stroke-opacity': options.stroke_opacity, stroke: options.stroke})
            .attrs({id: 'sphere', d: path, 'clip-path': 'url(#clip)'});
        create_li_layer_elem("Sphere", null, "Polygon", "sample");
        zoom_without_redraw();
        setSphereBottom();
    } else if (selected_feature == "graticule"){
        if(current_layers["Graticule"] != undefined) return;
        options.stroke = options.stroke || '#808080';
        options.stroke_width = options.stroke_width || "1px";
        options.stroke_opacity = options.stroke_opacity || 1;
        options.stroke_dasharray = options.stroke_dasharray || 5;
        options.step = options.step || 10;
        svg_layers.append("g").attrs({id: "Graticule", class: "layer"})
                .styles({'stroke-width': options.stroke_width})
                .append("path")
                .datum(d3.geoGraticule().step([options.step, options.step]))
                .attrs({'class': 'graticule', 'clip-path': 'url(#clip)', 'd': path})
                .styles({'stroke-dasharray': options.stroke_dasharray, 'fill': 'none', 'stroke': options.stroke});
        current_layers["Graticule"] = {
            "type": "Line",
            "n_features":1,
            "stroke-width-const": +options.stroke_width.slice(0,-2),
            "fill_color": {single: options.stroke},
            opacity: options.stroke_opacity,
            step: options.step,
            dasharray: options.stroke_dasharray,
            };
        create_li_layer_elem("Graticule", null, "Line", "sample");
        // up_legends();
        zoom_without_redraw();
    } else if (selected_feature == "scale"){
        if(!(scaleBar.displayed)){
            scaleBar.create();
        } else {
            ask_existing_feature('scalebar')
              .then(() => {
                  scaleBar.remove();
                  scaleBar.create();
                }, dismiss => { null; });
        }
    } else if (selected_feature == "north_arrow"){
        if(!(northArrow.displayed)){
            northArrow.display();
        } else {
            ask_existing_feature('north_arrow')
              .then( _ => {
                northArrow.remove();
                northArrow.display();
              }, dismiss => { null; });
        }
    } else if (selected_feature == "arrow"){
        handleClickAddArrow();
    } else if (selected_feature == "ellipse"){
        handleClickAddEllipse();
    } else if (selected_feature == "symbol"){
        if(!window.default_symbols){
            window.default_symbols = [];
            let a = prepare_available_symbols();
            a.then(confirmed => {
                let a = box_choice_symbol(window.default_symbols).then( result => {
                    if(result){ add_single_symbol(result.split("url(")[1].substring(1).slice(0,-2)); }
                });
            });
        } else {
            let a = box_choice_symbol(window.default_symbols).then( result => {
                if(result){ add_single_symbol(result.split("url(")[1].substring(1).slice(0,-2)); }
            });
        }
    } else {
        swal(i18next.t("app_page.common.error") + "!", i18next.t("app_page.common.error"), "error");
    }
}

function add_single_symbol(symbol_dataurl, x, y, width="30px", height="30px"){
    let context_menu = new ContextMenu(),
        getItems = (self_parent) => [
            {"name": i18next.t("app_page.common.options"), "action": () => { make_style_box_indiv_symbol(self_parent); }},
            {"name": i18next.t("app_page.common.up_element"), "action": () => { up_legend(self_parent.parentElement); }},
            {"name": i18next.t("app_page.common.down_element"), "action": () => { down_legend(self_parent.parentElement); }},
            {"name": i18next.t("app_page.common.delete"), "action": () => { self_parent.parentElement.remove(); }}
    ];

    x = x || w / 2;
    y = y || h / 2;
    return svg_legend.append("g")
        .attrs({class: "legend_features legend single_symbol"})
        .insert("image")
        .attrs({"x": x, "y": y, "width": width, "height": width,
                "xlink:href": symbol_dataurl})
        .on("mouseover", function(){ this.style.cursor = "pointer";})
        .on("mouseout", function(){ this.style.cursor = "initial";})
        .on("dblclick contextmenu", function(){
            context_menu.showMenu(d3.event, document.body, getItems(this));
            })
        .call(drag_elem_geo);
}

function add_layout_layers(){
    var existing_box = document.querySelector(".sampleLayoutDialogBox");
    if(existing_box){ existing_box.remove(); }

    var selec = {layout: null};
    var layout_layers = [[i18next.t("app_page.layout_layer_box.nuts0"), "nuts0"],
                         [i18next.t("app_page.layout_layer_box.nuts1"), "nuts1"],
                         [i18next.t("app_page.layout_layer_box.nuts2"), "nuts2"],
                         [i18next.t("app_page.layout_layer_box.brazil"), "brazil"],
                         [i18next.t("app_page.layout_layer_box.world_countries"), "world_country"],
                         [i18next.t("app_page.layout_layer_box.world_capitals"), "world_cities"],
                         [i18next.t("app_page.layout_layer_box.tissot"), "tissot"]
                         ];

    make_confirm_dialog2("sampleLayoutDialogBox", i18next.t("app_page.layout_layer_box.title"))
        .then(function(confirmed){
            if(confirmed){
                if(selec.layout && selec.layout.length > 0){
                    for(let i = 0; i < selec.layout.length; ++i){
                        add_sample_geojson(selec.layout[i]);
                    }
                }
            }
        });

    var box_body = d3.select(".sampleLayoutDialogBox").select(".modal-body").style("text-align", "center");
    box_body.node().parentElement.style.width = "auto";
    box_body.append('h3').html(i18next.t("app_page.layout_layer_box.msg_select_layer"));
    box_body.append("p").style("color", "grey").html(i18next.t("app_page.layout_layer_box.msg_select_multi"));

    var layout_layer_selec = box_body.append('p').html('')
                                    .insert('select')
                                    .attrs({class: 'sample_layout', multiple: "multiple", size: layout_layers.length});
    layout_layers.forEach(layer_info => {
        layout_layer_selec.append("option").html(layer_info[0]).attr("value", layer_info[1]);
    });
    layout_layer_selec.on("change", function(){
        let selected_asArray = Array.prototype.slice.call(this.selectedOptions);
        selec.layout = selected_asArray.map(elem => elem.value)
    });
    box_body.append("span").style("font-size", "0.65rem")
            .html(i18next.t("app_page.layout_layer_box.disclamer_nuts"))
}

function add_sample_layer(){
    var existing_dialog = document.querySelector(".sampleDialogBox");
    if(existing_dialog) existing_dialog.remove();

    var fields_type_sample = new Map([
        ['GrandParisMunicipalities', [{"name":"DEP","type":"category"},{"name":"IDCOM","type":"id"},{"name":"EPT","type":"category"},{"name":"INC","type":"stock"},{"name":"LIBCOM","type":"id"},{"name":"LIBEPT","type":"category"},{"name":"TH","type":"stock"},{"name":"UID","type":"id"},{"name":"IncPerTH","type":"ratio"}]],
        ['martinique', [{"name":"INSEE_COM","type":"id"},{"name":"NOM_COM","type":"id"},{"name":"STATUT","type":"category"},{"name":"SUPERFICIE","type":"stock"},{"name":"P13_POP","type":"stock"},{"name":"P13_LOG","type":"stock"},{"name":"P13_LOGVAC","type":"stock"},{"name":"Part_Logements_Vacants","type":"ratio"}]],
        ['nuts2-2013-data', [{"name":"id","type":"id"},{"name":"name","type":"id"},{"name":"POP","type":"stock"},{"name":"GDP","type":"stock"},{"name":"UNEMP","type":"ratio"},{"name":"COUNTRY","type":"category"}]],
        ['brazil', [{"name":"ADMIN_NAME","type":"id"},{"name":"Abbreviation","type":"id"},{"name":"Capital","type":"id"},{"name":"GDP_per_capita_2012","type":"stock"},{"name":"Life_expectancy_2014","type":"ratio"},{"name":"Pop2014","type":"stock"},{"name":"REGIONS","type":"category"},{"name":"STATE2010","type":"id"},{"name":"popdensity2014","type":"ratio"}]],
        ['world_countries_data', [{"name":"ISO2","type":"id"},{"name":"ISO3","type":"id"},{"name":"ISONUM","type":"id"},{"name":"NAMEen","type":"id"},{"name":"NAMEfr","type":"id"},{"name":"UNRegion","type":"category"},{"name":"GrowthRate","type":"ratio"},{"name":"PopDensity","type":"ratio"},{"name":"PopTotal","type":"stock"},{"name":"JamesBond","type":"stock"}]],
        ['us_states', [{"name":"NAME","type":"id"},{"name":"POPDENS1","type":"ratio"},{"name":"POPDENS2","type":"ratio"},{"name":"STUSPS","type":"id"},{"name":"pop2015_est","type":"stock"}]]
      ]);

    var dialog_res = [],
        selec,
        target_layers = [
           [i18next.t("app_page.sample_layer_box.target_layer"),""],
           [i18next.t("app_page.sample_layer_box.grandparismunicipalities"), "GrandParisMunicipalities"],
           [i18next.t("app_page.sample_layer_box.martinique"), "martinique"],
           [i18next.t("app_page.sample_layer_box.nuts2_data"), "nuts2-2013-data"],
           [i18next.t("app_page.sample_layer_box.brazil"), "brazil"],
           [i18next.t("app_page.sample_layer_box.world_countries"), "world_countries_data"],
           [i18next.t("app_page.sample_layer_box.us_states"), "us_states"]
        ];

    make_confirm_dialog2("sampleDialogBox", i18next.t("app_page.sample_layer_box.title"))
        .then(function(confirmed){
            if(confirmed){
                if(selec){
                    add_sample_geojson(selec, {target_layer_on_add: true, fields_type: fields_type_sample.get(selec)});
                }
            }
        });

    var box_body = d3.select(".sampleDialogBox").select(".modal-body");
    var title_tgt_layer = box_body.append('h3').html(i18next.t("app_page.sample_layer_box.subtitle1"));

    var t_layer_selec = box_body.append('p').html("").insert('select').attr('class', 'sample_target');
    target_layers.forEach(layer_info => { t_layer_selec.append("option").html(layer_info[0]).attr("value", layer_info[1]); });
    t_layer_selec.on("change", function(){selec = this.value;});

    if(_app.targeted_layer_added){
        title_tgt_layer.style("color", "grey")
                .html("<i>" + i18next.t("app_page.sample_layer_box.subtitle1") + "</i>");
        t_layer_selec.node().disabled = true;
    }
}

function add_simplified_land_layer(options = {}){
    options.skip_rescale = options.skip_rescale || false;
    options.stroke = options.stroke || "rgb(0,0,0)";
    options.fill = options.fill || "#d3d3d3";
    options.stroke_opacity = options.stroke_opacity || 0.0;
    options.fill_opacity = options.fill_opacity || 0.75;
    options.stroke_width = options.stroke_width || "0.3px";
    options.visible = options.visible === false ? false : true;

    d3.json("/static/data_sample/World.topojson", function(error, json) {
        _app.layer_to_id.set('World', 'World');
        _app.id_to_layer.set('World', 'World');
        current_layers["World"] = {
            "type": "Polygon",
            "n_features":125,
            "stroke-width-const": +options.stroke_width.slice(0,-2),
            "fill_color": {single: options.fill}
        };
        svg_layers.append("g")
            .attrs({id: "World", class: "layer"})
            .style("stroke-width", options.stroke_width)
            .selectAll('.subunit')
            .data(topojson.feature(json, json.objects.World).features)
            .enter()
            .append('path')
            .attrs({'d': path, 'clip-path': 'url(#clip)'})
            .styles({stroke: options.stroke, fill: options.fill,
                     "stroke-opacity": options.stroke_opacity, "fill-opacity": options.fill_opacity});
        create_li_layer_elem("World", null, "Polygon", "sample");
        if(!options.skip_rescale){
            scale_to_lyr("World");
            center_map("World");
        }
        if(!options.visible){
            handle_active_layer('World');
        }
        zoom_without_redraw();
    });
}

function add_sample_geojson(name, options){
    var formToSend = new FormData();
    formToSend.append("layer_name", name);
    xhrequest("POST", '/cache_topojson/sample_data', formToSend, true)
        .then( data => {
            add_layer_topojson(data, options);
        }).catch( err => {
            display_error_during_computation();
            console.log(err);
        });
}

function send_remove_server(layer_name){
    let formToSend = new FormData();
    formToSend.append("layer_name", current_layers[layer_name].key_name);
    xhrequest("POST", '/layers/delete', formToSend, true)
        .then(data => {
            data = JSON.parse(data);
            if(!data.code || data.code != "Ok")
                console.log(data);
          }).catch(err => {
              console.log(err);
          });
}

function get_map_xy0(){
    let bbox = svg_map.getBoundingClientRect();
    return {x: bbox.left, y: bbox.top}
}

function handleClickAddEllipse(){
    let getId = () => {
        let ellipses = document.getElementsByClassName("user_ellipse");
        if(!ellipses){
            return 0;
        } else if (ellipses.length > 30){
            swal(i18next.t("app_page.common.error"), i18next.t("app_page.common.error_max_arrows"), "error").catch(swal.noop);
            return null;
        } else {
            let ids = [];
            for(let i=0; i<ellipses.length; i++){
                ids.push(+ellipses[i].id.split("user_ellipse_")[1])
            }
            if(ids.indexOf(ellipses.length) == -1){
                return ellipses.length;
            } else {
                for(let i=0; i<ellipses.length; i++){
                    if(ids.indexOf(i) == -1){
                        return i;
                    }
                }
            }
            return null;
        }
        return null;
    };

    let start_point,
        tmp_start_point,
        ellipse_id = getId();

    if(ellipse_id === null){
        swal(i18next.t("app_page.common.error"), i18next.t("app_page.common.error_message", {msg: ""}), "error").catch(swal.noop);
        return;
    } else {
        ellipse_id = "user_ellipse_" + ellipse_id;
    }

    map.style("cursor", "crosshair")
        .on("click", function(){
            start_point = [d3.event.layerX, d3.event.layerY];
            tmp_start_point = map.append("rect")
                .attrs({x: start_point[0] - 2, y: start_point[1] - 2, height: 4, width: 4})
                .style("fill", "red");
            setTimeout(function(){
                tmp_start_point.remove();
            }, 1000);
            map.style("cursor", "")
                .on("click", null);
            new UserEllipse(ellipse_id, start_point, svg_legend.node());
        });
}

function handleClickTextBox(text_box_id){
    map.style("cursor", "crosshair")
        .on("click", function(){
            map.style("cursor", "").on("click", null);
            let text_box = new Textbox(svg_legend.node(), text_box_id, [d3.event.layerX, d3.event.layerY]);
            setTimeout(_ => { text_box.editStyle(); }, 350);
        });
}

function handleClickAddArrow(){
    let getId = () => {
        let arrows = document.getElementsByClassName("arrow");
        if(!arrows){
            return 0;
        } else if (arrows.length > 30){
            swal(i18next.t("app_page.common.error"), i18next.t("app_page.common.error_max_arrows"), "error").catch(swal.noop);
            return null;
        } else {
            let ids = [];
            for(let i=0; i<arrows.length; i++){
                ids.push(+arrows[i].id.split("arrow_")[1])
            }
            if(ids.indexOf(arrows.length) == -1){
                return arrows.length;
            } else {
                for(let i=0; i<arrows.length; i++){
                    if(ids.indexOf(i) == -1){
                        return i;
                    }
                }
            }
            return null;
        }
        return null;
    };

    let start_point,
        tmp_start_point,
        end_point,
        tmp_end_point,
        arrow_id = getId();

    if(arrow_id === null){
        swal(i18next.t("app_page.common.error"), i18next.t("app_page.common.error_message", {msg: ""}), "error").catch(swal.noop);
        return;
    } else {
        arrow_id = "arrow_" + arrow_id;
    }

    map.style("cursor", "crosshair")
        .on("click", function(){
            if(!start_point){
                start_point = [d3.event.layerX, d3.event.layerY];
                tmp_start_point = map.append("rect")
                    .attrs({x: start_point[0] - 2, y: start_point[1] - 2, height: 4, width: 4})
                    .style("fill", "red");
            } else {
                end_point = [d3.event.layerX, d3.event.layerY];
                tmp_end_point = map.append("rect")
                    .attrs({x: end_point[0] - 2, y: end_point[1] - 2, height: 4, width: 4})
                    .style("fill", "red");
            }
            if(start_point && end_point){
                setTimeout(function(){
                    tmp_start_point.remove();
                    tmp_end_point.remove();
                }, 1000);
                map.style("cursor", "")
                    .on("click", null);
                new UserArrow(arrow_id, start_point, end_point, svg_legend.node());
            }
        });
}

function prepare_available_symbols(){
    return xhrequest('GET', '/static/json/list_symbols.json', null)
            .then( list_res => {
               list_res = JSON.parse(list_res);
               return Q.all(list_res.map(name => xhrequest('GET', "/static/img/svg_symbols/" + name, null)))
                .then( symbols => {
                    for(let i=0; i<list_res.length; i++){
                        default_symbols.push([list_res[i], symbols[i]]);
                    }
                });
            })
}

function accordionize(css_selector=".accordion", parent){
    parent = parent && typeof parent === "object" ? parent
            : parent && typeof parent === "string" ? document.querySelector(parent)
            : document;
    let acc = parent.querySelectorAll(css_selector),
        opened_css_selector = css_selector + ".active";
    for (let i = 0; i < acc.length; i++) {
        acc[i].onclick = function(){
            let opened = parent.querySelector(opened_css_selector);
            if(opened){
                opened.classList.toggle("active");
                opened.nextElementSibling.classList.toggle("show");
            }
            if(!opened || opened.id != this.id){
                this.classList.toggle("active");
                this.nextElementSibling.classList.toggle("show");
            }
      }
    }
}
