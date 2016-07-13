"use strict";
////////////////////////////////////////////////////////////////////////
// Browse and upload buttons + related actions (conversion + displaying)
////////////////////////////////////////////////////////////////////////
const MAX_INPUT_SIZE = 12582912; // max allowed input size in bytes

/**
* Function triggered when some images of the interface are clicked
* in order to create an <input> element, simulate a click on it, let the user
* browse its file and dispatch the files to the appropriate handler according
* to the file type
*/
function click_button_add_layer(){
    var res = [],
        input = d3.select(document.createElement('input'))
                    .attr("type", "file").attr("multiple", "").attr("name", "file[]")
                    .attr("enctype", "multipart/form-data")
                    .on('change', function(){ prepareUpload(d3.event) });
    console.log(this.id);
    target_layer_on_add = (this.id === "input_geom") ? true :
                          (this.id === "img_in_geom") ? true :
                          (this.id === "img_data_ext") ? true :
                          (this.id === "data_ext") ? true : false;

    function prepareUpload(event){
        let files = event.target.files;
        for(let i=0; i < files.length; i++){
            if(files[i].size > MAX_INPUT_SIZE){
                alert("Too large input file (should currently be under 12Mb");
                return;
            }
        }
        if(strContains(files[0].name, 'topojson')){
            handle_TopoJSON_files(files);
        } else if(files.length == 1 && (strContains(files[0].name, 'geojson')
                            || strContains(files[0].name, 'zip') || strContains(files[0].name, 'kml'))){
            handle_single_file(files[0]);
        } else if((strContains(files[0].name.toLowerCase(), '.csv')
                    || strContains(files[0].name.toLowerCase(), '.tsv'))
                    && target_layer_on_add) {
            handle_dataset(files[0])
            target_layer_on_add = false;
        }
        else if(files.length >= 4){
            let filenames = Array.prototype.map.call(files, f => f.name),
                res = strArraysContains(filenames, ['.shp', '.dbf', '.shx', '.prj']);
            if(res.length >= 4)
                handle_shapefile(files);
            else
                alert('Layers have to be uploaded one by one and all mandatory files (.shp, .dbf, .shx, .prj) have been provided for reading a Shapefile');
        } else {
            alert('Invalid datasource (No GeoJSON/TopoJSON/zip/Shapefile detected)');
        }
    };
    input.node().dispatchEvent(new MouseEvent("click"))
}

/**
* Function called to bind the "drop zone" on the 2 desired menu elements
*
*/
function prepare_drop_section(){
    Array.prototype.forEach.call(
        document.querySelectorAll("#section1,#section3"),
        function(elem){
            elem.addEventListener("dragenter", function(e){
                e.preventDefault();
                e.stopPropagation();
                target_layer_on_add = false;
                elem.style.border = '3px dashed green';
            });
            elem.addEventListener("dragover", function(e){
                e.preventDefault();
                e.stopPropagation();
                elem.style.border = '3px dashed green';
            });
            elem.addEventListener("dragleave", function(e){
                e.preventDefault();
                e.stopPropagation();
                elem.style.border = '';
            });
            elem.addEventListener("drop", function(e) {
                e.preventDefault();
                let files = e.dataTransfer.files,
                    self_section = elem.id;

                e.stopPropagation();

                if(self_section === "section1")
                    target_layer_on_add = true;

                for(let i=0; i < files.length; i++){
                    if(files[i].size > MAX_INPUT_SIZE){
                        elem.style.border = '3px dashed red';
                        alert("Too large input file (should currently be under 12Mb");
                        elem.style.border = '';
                        return;
                    }
                }

                if(!(files.length == 1)){
                    var filenames = Array.prototype.map.call(files, f => f.name),
                        result = strArraysContains(filenames, ['.shp', '.dbf', '.shx', '.prj']);
                    elem.style.border = '';
                    if(target_layer_on_add && targeted_layer_added){
                           alert("Only one layer can be added by this functionnality");
                    } else if(result.length == 4){
                        handle_shapefile(files);
                    } else {
                        elem.style.border = '3px dashed red';
                        alert('Layers have to be uploaded one by one and all mandatory files (.shp, .dbf, .shx, .prj) have been provided for reading a Shapefile');
                        elem.style.border = '';
                    }
                }
                else if(strContains(files[0].name.toLowerCase(), 'topojson')){
                       elem.style.border = '';
                       if(target_layer_on_add && targeted_layer_added)
                           alert("Only one layer can be added by this functionnality");
                       // Most direct way to add a layer :
                       else handle_TopoJSON_files(files);
               }
               else if(strContains(files[0].name.toLowerCase(), 'geojson') ||
                    strContains(files[0].name.toLowerCase(), 'zip') ||
                    strContains(files[0].name.toLowerCase(), 'kml')){
                       elem.style.border = '';

                       if(target_layer_on_add && targeted_layer_added)
                           alert("Only one layer can be added by this functionnality");
                       // Send the file to the server for conversion :
                       else handle_single_file(files[0]);
               }
              else if(strContains(files[0].name.toLowerCase(), '.csv')
                || strContains(files[0].name.toLowerCase(), '.tsv')) {
                    elem.style.border = '';
                    if(self_section === "section1")
                        handle_dataset(files[0]);
                    else
                        alert('Only layout layers can be added here');
                    target_layer_on_add = false;
               }
              else {
                    elem.style.border = '3px dashed red';
                    alert('Invalid datasource (No GeoJSON/TopoJSON/zip/Shapefile detected)');
                    elem.style.border = '';
                }
            }, true);
    });
}


function handle_shapefile(files){
    var ajaxData = new FormData();
    ajaxData.append("action", "submit_form");
    for(let j=0; j<files.length; j++){
        ajaxData.append('file['+j+']', files[j]);
    }
     $.ajax({
        processData: false,
        contentType: false,
        url: '/convert_to_topojson',
        data: ajaxData,
        type: 'POST',
        success: function(data) {add_layer_topojson(data);},
        error: function(error) {console.log(error); }
        });

}

function handle_TopoJSON_files(files) {
    var f = files[0],
        name = files[0].name,
        reader = new FileReader(),
        ajaxData = new FormData();
    ajaxData.append('file[]', f);
    $.ajax({
        processData: false,
        contentType: false,
        global: false,
        url: '/cache_topojson/user',
        data: ajaxData,
        type: 'POST',
        error: function(error) { console.log(error);},
        success: function(res){
            let key = JSON.parse(res).key;
            reader.onloadend = function(){
                let text = reader.result;
                let topoObjText = ['{"key": ', key, ',"file":', text, '}'].join('');
                console.log(topoObjText)
                add_layer_topojson(topoObjText);
                }
            reader.readAsText(f);
        }
    });
};

/**
* Handle a csv dataset by parsing it as an array of Object (ie features) or by
* converting it to topojson if it contains valid x/y/lat/lon/etc. columns and
* adding it to the map
* @param {File} f - The input csv file
*/
function handle_dataset(f){
    if(joined_dataset.length !== 0){
        var rep = confirm("An additional dataset as already been provided. Replace by this one ?");
        if(!rep){ return; }
        else joined_dataset = [];
    }
    var reader = new FileReader(),
        name = f.name;

    reader.onload = function(e) {
        var data = e.target.result;
        dataset_name = name.substring(0, name.indexOf('.csv'));
        let tmp_dataset = d3.csv.parse(data);
        add_dataset(tmp_dataset);
    };
    reader.readAsText(f);
}


/**
*
*
*/
function add_dataset(readed_dataset){
    let field_name = Object.getOwnPropertyNames(readed_dataset[0]);
    if(field_name.indexOf("x") > -1 || field_name.indexOf("X") > -1 || field_name.indexOf("lat") > -1 || field_name.indexOf("latitude") > -1){
        if(field_name.indexOf("y") > -1 || field_name.indexOf("Y") > -1 || field_name.indexOf("lon") > -1 || field_name.indexOf("longitude") > -1 || field_name.indexOf("long") > -1){
            add_csv_geom(data, dataset_name);
            return;
        }
    }
    joined_dataset.push(readed_dataset);
    let d_name = dataset_name.length > 20 ? [dataset_name.substring(0, 17), "(...)"].join('') : dataset_name,
        nb_features = joined_dataset[0].length;

    d3.select("#img_data_ext")
        .attr({"id": "img_data_ext", "class": "user_panel", "src": "/static/img/b/tabular.svg", "width": "26", "height": "26",  "alt": "Additional dataset"});

    d3.select('#data_ext')
        .attr("layer-target-tooltip", "<b>" + dataset_name + '.csv</b> - ' + nb_features + ' features')
        .html([' <b>', d_name,
               '</b> - <i><span style="font-size:9px;"> ',
               nb_features, ' features - ',
               field_name.length, " fields</i></span>"].join(''));
    d3.select("#data_ext").node().parentElement.innerHTML = d3.select("#data_ext").node().parentElement.innerHTML + '<img width="15" height="15" src="/static/img/Red_x.svg" id="remove_dataset" style="float:right;margin-top:10px;">';

    valid_join_check_display(false);
    if(targeted_layer_added){
        document.getElementById("join_button").disabled = false;
        document.getElementById('sample_zone').style.display = "none";
    } else {
        document.getElementById("join_button").disabled = true;
    }
    if(current_functionnality && current_functionnality.name == "flow")
        fields_handler.fill();
    document.getElementById("remove_dataset").onclick = () => { remove_ext_dataset() };
    if(document.getElementById("browse_button").disabled === true)
        document.getElementById("browse_button").disabled = false;
    $("[layer-target-tooltip!='']").qtip("destoy");
    $("[layer-target-tooltip!='']").qtip({
        content: { attr: "layer-target-tooltip" },
        style: { classes: 'qtip-rounded qtip-light qtip_layer'},
        events: {
            show: function(){ $('.qtip.qtip-section1').qtip("hide") },
            hide: function(){ $('.qtip.qtip-section1').qtip("show") }
        }
    });
}

function add_csv_geom(file, name){
    var ajaxData = new FormData();
    ajaxData.append('filename', name);
    ajaxData.append('csv_file', file);
    $.ajax({
        processData: false,
        contentType: false,
        url: '/convert_csv_geo',
        data: ajaxData,
        type: 'POST',
        error: function(error) {  console.log(error);  },
        success: function(data) {
            dataset_name = undefined;
            target_layer_on_add = true;
            add_layer_topojson(data);
            target_layer_on_add = false;
        }
    });
}

/**
* Send a single file (.zip / .kml / .geojson) to the server in order to get
* the converted layer added to the map
* @param {File} file
*/
function handle_single_file(file) {
    var ajaxData = new FormData();
    ajaxData.append("action", "single_file");
    ajaxData.append('file[]', file);
    $.ajax({
        processData: false,
        contentType: false,
        url: '/convert_to_topojson',
        data: ajaxData,
        type: 'POST',
        success: function(data) {add_layer_topojson(data);},
        error: function(error) {console.log(error);}
    });
};

function get_display_name_on_layer_list(layer_name_to_add){
    return +layer_name_to_add.length > 28
        ? [layer_name_to_add.substring(0, 23), '(...)'].join('')
        : layer_name_to_add;
}

// Add the TopoJSON to the 'svg' element :
function add_layer_topojson(text, options){

    var parsedJSON = JSON.parse(text),
        result_layer_on_add = (options && options.result_layer_on_add) ? true : false,
        skip_alert = (options && options.skip_alert) ? true : false;

    if(parsedJSON.Error){  // Server returns a JSON reponse like {"Error":"The error"} if something went bad during the conversion
        alert(parsedJSON.Error);
        return;
    }
    var type = "",
        topoObj = parsedJSON.file,
        data_to_load = false,
        layers_names = Object.getOwnPropertyNames(topoObj.objects);

    // Loop over the layers to add them all ?
    // Probably better open an alert asking to the user which one to load ?
    for(let i=0; i < layers_names.length; i++){
        var random_color1 = ColorsSelected.random(),
            lyr_name = layers_names[i],
            lyr_name_to_add = check_layer_name(lyr_name),
            nb_ft = topoObj.objects[lyr_name].geometries.length,
            field_names = topoObj.objects[lyr_name].geometries[0].properties ? Object.getOwnPropertyNames(topoObj.objects[lyr_name].geometries[0].properties) : [];

        if(topoObj.objects[lyr_name].geometries[0].type.indexOf('Point') > -1) type = 'Point';
        else if(topoObj.objects[lyr_name].geometries[0].type.indexOf('LineString') > -1) type = 'Line';
        else if(topoObj.objects[lyr_name].geometries[0].type.indexOf('Polygon') > -1) type = 'Polygon';

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
        } else if(result_layer_on_add){
            result_data[lyr_name_to_add] = [];
            current_layers[lyr_name_to_add].is_result = true;
        }

        map.append("g").attr("id", lyr_name_to_add)
              .attr("class", data_to_load ? "targeted_layer layer" : "layer")
              .style({"stroke-linecap": "round", "stroke-linejoin": "round"})
              .selectAll(".subunit")
              .data(topojson.feature(topoObj, topoObj.objects[lyr_name]).features)
              .enter().append("path")
              .attr("d", path)
              .attr("id", function(d, ix) {
                    if(data_to_load){
                        if(field_names.length > 0){
                            if(d.id != ix){
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
              .style("stroke", type != 'Line' ? "rgb(0, 0, 0)" : random_color1)
              .style("stroke-opacity", .4)
              .style("fill", type != 'Line' ? random_color1 : null)
              .style("fill-opacity", type != 'Line' ? 0.75 : 0)
              .attr("height", "100%")
              .attr("width", "100%");

        let class_name = [
            "ui-state-default ",
            target_layer_on_add ? "sortable_target " : result_layer_on_add ? "sortable_result " : null,
            lyr_name_to_add
            ].join('');

        let layers_listed = layer_list.node(),
            li = document.createElement("li"),
            nb_fields = field_names.length,
            layer_tooltip_content =  ["<b>", lyr_name_to_add, "</b> - ", type, " - ", nb_ft, " features - ", nb_fields, " fields"].join(''),
            _lyr_name_display_menu = get_display_name_on_layer_list(lyr_name_to_add);

        li.setAttribute("class", class_name);
        li.setAttribute("layer_name", lyr_name_to_add)
        li.setAttribute("layer-tooltip", layer_tooltip_content)
        if(target_layer_on_add){
            current_layers[lyr_name_to_add].original_fields = new Set(Object.getOwnPropertyNames(user_data[lyr_name_to_add][0]));
            if(document.getElementById("browse_button").disabled === true)
                document.getElementById("browse_button").disabled = false;

            if(joined_dataset.length != 0){
                if(document.getElementById("join_button"))
                    document.getElementById("join_button").disabled = false;
                section1.select(".s1").html("").on("click", null);
                document.getElementById('sample_zone').style.display = "none";
            }

            let _button = button_type[type],
                nb_fields = field_names.length,
                nb_char_display = lyr_name_to_add.length + nb_fields.toString().length + nb_ft.toString().length,
                _lyr_name_display = +nb_char_display > 23 ? [lyr_name_to_add.substring(0, 18), '(...)'].join('') : lyr_name_to_add;

            _button = _button.substring(10, _button.indexOf("class") - 2);
            d3.select("#img_in_geom")
                .attr({"src": _button, "width": "26", "height": "26"})
                .on("click", null);
            d3.select('#input_geom')
                .attr("layer-target-tooltip", layer_tooltip_content)
                .html(['<b>', _lyr_name_display,'</b> - <i><span style="font-size:9px;">', nb_ft, ' features - ',
                       nb_fields, ' fields</i></span>'].join(''));
            d3.select("#input_geom").node().parentElement.innerHTML = d3.select("#input_geom").node().parentElement.innerHTML + '<img width="15" height="15" src="/static/img/Red_x.svg" id="remove_target" style="float:right;margin-top:10px;">'

            targeted_layer_added = true;
            li.innerHTML = ['<div class="layer_buttons">', sys_run_button_t2, button_trash, button_zoom_fit, eye_open0, button_type[type], "</div> ",_lyr_name_display_menu].join('')
            $("[layer-target-tooltip!='']").qtip("destoy");
            $("[layer-target-tooltip!='']").qtip({
                content: { attr: "layer-target-tooltip" },
                style: { classes: 'qtip-rounded qtip-light qtip_layer'},
                events: {
                    show: function(){ $('.qtip.qtip-section1').qtip("hide") },
                    hide: function(){ $('.qtip.qtip-section1').qtip("show") }
                }
            });
        } else if (result_layer_on_add) {
            li.innerHTML = ['<div class="layer_buttons">', sys_run_button_t2, button_trash, button_zoom_fit, eye_open0, button_legend, button_result_type.get(current_functionnality.name), "</div> ",_lyr_name_display_menu].join('')
        } else {
            li.innerHTML = ['<div class="layer_buttons">', button_style, button_trash, button_zoom_fit, eye_open0, button_type[type], "</div> ",_lyr_name_display_menu].join('')
        }
        layers_listed.insertBefore(li, layers_listed.childNodes[0])
    }

    if(target_layer_on_add) {
        if(current_functionnality) fields_handler.fill(lyr_name_to_add);
        window._target_layer_file = topoObj;
        scale_to_lyr(lyr_name_to_add);
        center_map(lyr_name_to_add);
    } else if (result_layer_on_add) {
        center_map(lyr_name_to_add);
        switch_accordion_section();
    } else if (current_functionnality && current_functionnality.name == "smooth"){
        fields_handler.fill();
    }
    zoom_without_redraw();
    binds_layers_buttons(lyr_name_to_add);
    target_layer_on_add = false;

    document.getElementById("remove_target").onclick = function(){
        remove_layer(lyr_name_to_add);
    };

//    if(!skip_alert) alert('Layer successfully added to the canvas');
    if(!skip_alert) swal("Success!", "Layer successfully added to the map", "success")
    return lyr_name_to_add;
};

/**
* Change the projection scale and translate properties in order to fit the layer.
* Redraw the path from all the current layers to reflect the change.
*
* @param {string} name - The name of layer to scale on
*/
function scale_to_lyr(name){
    name = current_layers[name].ref_layer_name || name;
    var bbox_layer_path = undefined;
    map.select("#"+name).selectAll('path').each(function(d, i){
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
    let prev_trans = proj.translate(),
        prev_scale = proj.scale();
    s = 0.95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h) * proj.scale();
    proj.scale(s);
    map.selectAll("g.layer").selectAll("path").attr("d", path);
};

/**
* Center and zoom to a layer (using zoom scale and translate properties).
* Projection properties stay unchanged.
*
* @param {string} name - The name of layer to zoom on
*/
function center_map(name){
    var bbox_layer_path = undefined;
    name = current_layers[name].ref_layer_name || name;
    map.select("#"+name).selectAll('path').each(function(d, i){
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
    var _s = .95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h),
        _t = [(w - _s * (bbox_layer_path[1][0] + bbox_layer_path[0][0])) / 2, (h - _s * (bbox_layer_path[1][1] + bbox_layer_path[0][1])) / 2];
    zoom.scale(_s).translate(_t);
};

// Some helpers
function strContains(string1, substring){
    return string1.indexOf(substring) >= 0;
};

function strArraysContains(ArrString1, ArrSubstrings){
    var result = [];
    for(var i=0; i < ArrString1.length; i++){
        for(var j=0; j < ArrSubstrings.length; j++){
            if(strContains(ArrString1[i], ArrSubstrings[j])){
            result[result.length] = ArrSubstrings[j];
            }
        }
    }
    return result;
};

function select_layout_features(){
    var available_features = ["North arrow", "Scale", "Sphere background", "Graticule", "Text annotation"],
        selected_ft = undefined;

    make_confirm_dialog("", "Valid", "Cancel", "Layout features", "sampleLayoutFtDialogBox").then(
            confirmed => { if(confirmed) add_layout_feature(selected_ft);
        });

    var box_body = d3.select(".sampleLayoutFtDialogBox");
    box_body.node().parentElement.style.width = "auto";
    box_body.append('h3').html("Choose features to be added : ");

    var layout_ft_selec = box_body.append('p').html('')
                            .insert('select').attr({class: 'sample_layout',
                                                    size: available_features.length});

    available_features.forEach(function(ft){
        layout_ft_selec.append("option").html(ft).attr("value", ft);
    });
    layout_ft_selec.on("change", function(){ selected_ft = this.value; });
}


function add_layout_feature(selected_feature){
    if(selected_feature == "Text annotation"){
        let existing_annotation = document.querySelectorAll(".txt_annot"),
            existing_id = [],
            new_id;
        if(existing_annotation)
            existing_id = Array.prototype.map.call(
                            existing_annotation,
                            elem => +elem.childNodes[1].id.split('text_annotation_')[1]
                            );
        for(let i in range(25)){
            i = +i;
            if(existing_id.indexOf(i) == -1){
                existing_id.push(i);
                new_id = ["text_annotation_", i].join('');
                break;
            } else continue;
        }
        if(!(new_id)){
            alert("Maximum number of text annotations has been reached")
            return;
        }
        let txt_box = new Textbox2(map, new_id);

    } else if (selected_feature == "Sphere background"){
        if(current_layers.Sphere) return;
        current_layers["Sphere"] = {"type": "Polygon", "n_features":1, "stroke-width-const": 0.5, "fill_color" : {single: "#add8e6"}};
        map.append("g").attr({id: "Sphere", class: "layer", "stroke-width": "0.5px",  "stroke": "black"})
            .append("path")
            .datum({type: "Sphere"})
            .style({fill: "lightblue", "fill-opacity": 0.2})
            .attr("id", "sphere")
            .attr("d", path);
        create_li_layer_elem("Sphere", null, "Polygon", "sample");
        zoom_without_redraw();
    } else if (selected_feature == "Graticule"){
        if(current_layers["Graticule"] != undefined)
            return;
        map.append("g").attr({id: "Graticule", class: "layer"})
               .append("path")
               .attr("class", "graticule")
               .style("stroke-dasharray",  5)
               .datum(d3.geo.graticule())
               .attr("d", path)
               .style("fill", "none")
               .style("stroke", "grey");
        current_layers["Graticule"] = {"type": "Line", "n_features":1, "stroke-width-const": 1, "fill_color": {single: "grey"}};
        create_li_layer_elem("Graticule", null, "Line", "sample");
        zoom_without_redraw();
    } else if (selected_feature == "Scale"){
        if(!(scaleBar.displayed))
            scaleBar.create();
        else
            alert("Only one scale bar can be added - Use right click to change its properties");
    } else {
        alert("Not available yet..!")
    }
}

/**
* Handler for the scale bar (only designed for one scale bar)
*
*/
var scaleBar = {
    create: function(){
        let scale_gp = map.append("g").attr("id", "scale_bar").attr("class", "legend scale"),
            x_pos = 40,
            y_pos = h - 100,
            bar_size = 50,
            self = this;

        this.x = x_pos;
        this.y = y_pos;
        this.bar_size = bar_size;
        this.getDist();

        let drag_scale = d3.behavior.drag()
                .origin(function() {
                    let t = d3.select(this);
                    return {x: t.attr("x") + d3.transform(t.attr("transform")).translate[0],
                            y: t.attr("y") + d3.transform(t.attr("transform")).translate[1]};
                })
                .on("dragstart", () => {
                    d3.event.sourceEvent.stopPropagation();
                    d3.event.sourceEvent.preventDefault();
                    if(d3.select("#hand_button").classed("active")) zoom.on("zoom", null);
                  })
                .on("dragend", function(){
                    if(d3.select("#hand_button").classed("active")) zoom.on("zoom", zoom_without_redraw);
                  })
                .on("drag", function(){
                    d3.select(this)
                        .attr('transform', 'translate(' + [d3.event.x, d3.event.y] + ')');
                    let t = d3.select(this);
                    self.x = t.attr("x") + d3.transform(t.attr("transform")).translate[0];
                    self.y = t.attr("y") + d3.transform(t.attr("transform")).translate[1];
                  });

        let getItems = () => [
            {"name": "Resize", "action": () => { alert('foo')}},
            {"name": "Edit Style...", "action": () => { alert("bar"); }},
            {"name": "Delete", "action": () => { this.remove(); }}
        ];

        let scale_context_menu = new ContextMenu();
        scale_gp.insert("rect")
            .attr({x: x_pos - 5, y: y_pos-30, height: 30, width: bar_size + 5})
            .style("fill", "transparent");
        scale_gp.insert("rect").attr("id", "rect_scale")
            .attr({x: x_pos, y: y_pos, height: 2, width: bar_size})
            .style("fill", "black");
        scale_gp.insert("text")
            .attr({x: x_pos - 4, y: y_pos - 5})
            .text("0");
        scale_gp.insert("text").attr("id", "text_limit_sup_scale")
            .attr({x: x_pos + bar_size, y: y_pos - 5})
            .text(this.dist_txt + " km");

        scale_gp.call(drag_scale);
        scale_gp.on("contextmenu", (d,i) => {
                    d3.event.preventDefault();
                    return scale_context_menu
                       .showMenu(d3.event, document.querySelector("body"), getItems());
                });
        this.Scale = scale_gp;
        this.displayed = true;
    },
    getDist: function(){
        let x_pos = w / 2,
            y_pos = h / 2,
            z_trans = zoom.translate(),
            z_scale = zoom.scale();

        let pt1 = proj.invert([(x_pos - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]),
            pt2 = proj.invert([(x_pos + this.bar_size - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]);

        let dist = haversine_dist(pt1, pt2);
        this.dist_txt = dist > 0 ? dist.toFixed(0) : dist.toFixed(2);
        this.dist = dist;

    },
    resize: function(){
        let z_scale = zoom.scale();
        this.Scale.select("#rect_scale");

    },
    changeText: function(){
        this.getDist();
        this.Scale.select("#text_limit_sup_scale").text(this.dist_txt + " km");
    },
    remove: function(){
        this.Scale.remove();
        this.Scale = null;
        this.displayed = false;
    },
    displayed: false
};

function add_layout_layers(){
    var selec = {layout: null};
    var layout_layers = [["Nuts 0 (2013) European Country <i>(Polygons)</i>", "nuts0"],
                         ["Nuts 1 (2013) European subdivisions <i>(Polygons)</i>", "nuts1"],
                         ["Nuts 2 (2013) European subdivisions <i>(Polygons)</i>", "nuts2"],
                         ["World countries simplified <i>(Polygons)</i>", "world_country"],
                         ["World country capitals <i>(Points)</i>", "world_cities"],
                         ];


    var a = make_confirm_dialog("", "Valid", "Cancel", "Sample layout layers", "sampleLayoutDialogBox").then(
        function(confirmed){
            if(confirmed){
                let url = undefined;
                if(selec.layout && selec.layout.length > 0){
                    for(let i = 0; i < selec.layout.length; ++i){
                        add_sample_geojson(selec.layout[i]);
                    }
                }
            }
        });

    var box_body = d3.select(".sampleLayoutDialogBox");
    box_body.node().parentElement.style.width = "auto";
    box_body.append('h3').html("Choose layer(s) to be used as layout : ");
    box_body.append("p").style("color", "grey").html("<i>(multiple layers can be selected)</i>");

    var layout_layer_selec = box_body.append('p').html('')
                                    .insert('select')
                                    .attr({class: 'sample_layout', multiple: "multiple", size: layout_layers.length});
    layout_layers.forEach(function(layer_info){layout_layer_selec.append("option").html(layer_info[0]).attr("value", layer_info[1]);});
    layout_layer_selec.on("change", function(){
        let selected_asArray = Array.prototype.slice.call(this.selectedOptions);
        selec.layout = selected_asArray.map(elem => elem.value)
    });
}


function add_sample_layer(){
    var dialog_res = [],
        selec = {layout: null, target: null},
        sample_datasets = undefined;

    d3.json('/static/json/sample_layers.json', function(error, json){
        sample_datasets = json[0];
        });

    var target_layers = [["<i>Target layer</i>",""],
                    ["Paris hospital locations <i>(Points)</i>", "paris_hospitals"],
                    ["Grand Paris municipalities <i>(Polygons)</i>", "GrandParisMunicipalities"],
                    ["Nuts 2 (2013) European subdivisions <i>(Polygons)</i>", "nuts2_data"],
                    ["World countries <i>(Polygons)</i>", "world_countries_50m"],
                    ["U.S.A counties <i>(Polygons)</i>", "us_county"],
                    ["U.S.A states <i>(Polygons)</i>", "us_states"]];

    var tabular_datasets = [["<i>Tabular dataset</i>",""],
                    ["International Twinning Agreements Between Cities <i>(To link with nuts2 geometries)</i>", "twincities"],
                    ['"Grand Paris" incomes dataset <i>(To link with Grand Paris municipality geometries)</i>', 'gpm_dataset']];

    var a = make_confirm_dialog("", "Valid", "Cancel", "Sample layers...", "sampleDialogBox").then(
        function(confirmed){
            if(confirmed){
                let url = undefined;
                if(selec.target){
                    target_layer_on_add = true;
                    add_sample_geojson(selec.target);
                }
                if(selec.dataset){
                    url = sample_datasets[selec.dataset];
                    d3.csv(url, function(error, data){
                        dataset_name = selec.dataset;
                        add_dataset(data);
                    });
                }
            }
        });

    var box_body = d3.select(".sampleDialogBox");
    box_body.node().parentElement.style.width = "auto";
    var title_tgt_layer = box_body.append('h3').html("Choose a layer to be rendered : ");

    var t_layer_selec = box_body.append('p').html("").insert('select').attr('class', 'sample_target');
    target_layers.forEach(function(layer_info){t_layer_selec.append("option").html(layer_info[0]).attr("value", layer_info[1]);});
    t_layer_selec.on("change", function(){selec.target = this.value;});

    if(targeted_layer_added){
        title_tgt_layer.style("color", "grey").html("<i>Choose a layer to be rendered : </i>");
        t_layer_selec.node().disabled = true;
        }

    box_body.append('h3').html("Choose a dataset to link with geometries: ");

    var dataset_selec = box_body.append('p').html('').insert('select').attr("class", "sample_dataset");
    tabular_datasets.forEach(function(layer_info){dataset_selec.append("option").html(layer_info[0]).attr("value", layer_info[1]);});
    dataset_selec.on("change", function(){selec.dataset = this.value;});
}



function add_sample_geojson(name){
    var formToSend = new FormData();
    formToSend.append("layer_name", name);
    $.ajax({
        processData: false,
        contentType: false,
        url: '/cache_topojson/sample_data',
        data: formToSend,
        type: 'POST',
        success: function(data){ add_layer_topojson(data); },
        error: function(error) { console.log(error); }
    });
}

function send_remove_server(layer_name){
    let formToSend = new FormData();
    formToSend.append("layer_name", current_layers[layer_name].key_name);
    $.ajax({
        processData: false,
        contentType: false,
        global: false,
        url: '/layers/delete',
        data: formToSend,
        type: 'POST',
        success: function(data){ console.log(JSON.parse(data)) },
        error: function(error) { console.log(error); }
    });
}

function list_existing_layers_server(){
    $.ajax({
        processData: false,
        contentType: false,
        global: false,
        url: '/layers',
        type: 'GET',
        success: function(data){ console.log(JSON.parse(data)) },
        error: function(error) { console.log(error); }
    });
}