"use strict";
// TODO : refactor some functions in this file (they are really too messy)
function handle_click_layer(layer_name){
    if(layer_name == "Graticule")
        createStyleBoxGraticule();
    else if(current_layers[layer_name].renderer
        && current_layers[layer_name].renderer.indexOf("PropSymbol") > -1)
        createStyleBox_ProbSymbol(layer_name);
    else if (current_layers[layer_name].renderer
             && current_layers[layer_name].renderer == "Label")
        createStyleBoxLabel(layer_name);
    else if (current_layers[layer_name].renderer
            && current_layers[layer_name].renderer == "TypoSymbols")
        createStyleBoxTypoSymbols(layer_name);
    else
        createStyleBox(layer_name);
    return;
};

function make_single_color_menu(layer, fill_prev, symbol = "path"){
    var fill_color_section = d3.select("#fill_color_section"),
        g_lyr_name = "#" + _app.layer_to_id.get(layer),
        last_color = (fill_prev && fill_prev.single) ? fill_prev.single : "#FFF";
    let block = fill_color_section.insert('p');
    block.insert("span")
          .html(i18next.t("app_page.layer_style_popup.fill_color"));
    block.insert('input')
          .style("float", "right")
          .attrs({type: 'color', "value": last_color})
          .on('change', function(){
                svg_layers.select(g_lyr_name)
                    .selectAll(symbol)
                    .transition()
                    .style("fill", this.value);
                current_layers[layer].fill_color = {"single": this.value};
          });
}

function make_random_color(layer, symbol = "path"){
    let block = d3.select("#fill_color_section");
    block.selectAll('span').remove();
    block.insert("span")
        .styles({"cursor": "pointer", "text-align": "center"})
        .html(i18next.t("app_page.layer_style_popup.toggle_colors"))
        .on("click", function(d,i){
            svg_layers.select("#" + _app.layer_to_id.get(layer))
                .selectAll(symbol)
                .transition()
                .style("fill", () => Colors.names[Colors.random()]);
            current_layers[layer].fill_color = {"random": true};
            make_random_color(layer, symbol);
        });
}

function fill_categorical(layer, field_name, symbol, color_cat_map){
    svg_layers.select("#"+_app.layer_to_id.get(layer))
        .selectAll(symbol)
        .transition()
        .style("fill", d => color_cat_map.get(d.properties[field_name]));
}

function make_categorical_color_menu(fields, layer, fill_prev, symbol = "path"){
    var fill_color_section = d3.select("#fill_color_section").append("p");
   fill_color_section.insert("span").html(i18next.t("app_page.layer_style_popup.categorical_field"));
   var field_selec = fill_color_section.insert("select");
    fields.forEach(function(field){
        if(field != "id")
            field_selec.append("option").text(field).attr("value", field)
    });
    if(fill_prev.categorical && fill_prev.categorical instanceof Array)
        setSelected(field_selec.node(), fill_prev.categorical[0])

    field_selec.on("change", function(){
        let field_name = this.value,
            data_layer = current_layers[layer].is_result ? result_data[layer] : user_data[layer],
            values = data_layer.map(i => i[field_name]),
            cats = new Set(values),
            txt = [cats.size, " cat."].join('');
        d3.select("#nb_cat_txt").html(txt)
        var color_cat_map = new Map();
        for(let val of cats)
            color_cat_map.set(val, Colors.names[Colors.random()])

        current_layers[layer].fill_color = { "categorical": [field_name, color_cat_map] };
        fill_categorical(layer, field_name, symbol, color_cat_map)
    });

    if((!fill_prev || !fill_prev.categorical) && field_selec.node().options.length > 0)
        setSelected(field_selec.node(), field_selec.node().options[0].value)

    fill_color_section.append("span").attr("id", "nb_cat_txt").html("");

};

let cloneObj = function(obj){
    if(obj === null || typeof obj !== "object")
        return obj;
    else if(obj.toString() == "[object Map]"){
        return new Map(obj.entries());
    } else {
        return Object.assign({}, obj);
    }
}

function createStyleBoxTypoSymbols(layer_name){
    function get_prev_settings(){
        let features = selection._groups[0];
        for(let i = 0; i<features.length; i++){
            prev_settings.push({
                "display": features[i].style.display ? features[i].style.display : null,
                "size": features[i].getAttribute("width"),
                "position": [features[i].getAttribute("x"), features[i].getAttribute("y")]
            });
        }
        prev_settings_defaults["size"] = current_layers[layer_name].default_size;
    }

    function restore_prev_settings(){
        let features = selection._groups[0];
        for(let i = 0; i<features.length; i++){
            features[i].setAttribute("width", prev_settings[i]["size"]);
            features[i].setAttribute("height", prev_settings[i]["size"]);
            features[i].setAttribute("x", prev_settings[i]["position"][0]);
            features[i].setAttribute("y", prev_settings[i]["position"][1]);
            features[i].style.display = prev_settings[i]["display"];
        }
        current_layers[layer_name].default_size = prev_settings_defaults.size;
    }

    let existing_box = document.querySelector(".styleBox");
    if(existing_box) existing_box.remove();

    var selection = svg_layers.select("#" + _app.layer_to_id.get(layer_name)).selectAll("image"),
        ref_layer_name = current_layers[layer_name].ref_layer_name,
        symbols_map = current_layers[layer_name].symbols_map,
        rendered_field = current_layers[layer_name].rendered_field;


    var prev_settings = [],
        prev_settings_defaults = {},
        zs = d3.zoomTransform(svg_map).k;

    get_prev_settings();

    make_confirm_dialog2("styleBox", layer_name, {top: true, widthFitContent: true, draggable: true})
        .then(function(confirmed){
            if(!confirmed){
                restore_prev_settings();
            }
        });

    var popup = d3.select(".styleBox").select(".modal-body").style("width", "295px");
    popup.append("p")
            .styles({"text-align": "center", "color": "grey"})
            .html([i18next.t("app_page.layer_style_popup.rendered_field", {field: rendered_field}),
                   i18next.t("app_page.layer_style_popup.reference_layer", {layer: ref_layer_name})].join(''));

    popup.append("p").style("text-align", "center")
        .insert("button")
        .attrs({id: 'reset_symb_loc', class: 'button_st4'})
        .text(i18next.t("app_page.layer_style_popup.reset_symbols_location"))
        .on("click", function(){
            selection.transition()
                    .attrs(d => {
                      let centroid = path.centroid(d.geometry),
                          size_symbol = symbols_map.get(d.properties.symbol_field)[1] / 2
                      return {x: centroid[0] - size_symbol, y: centroid[1] - size_symbol};
                    });
        });

    popup.append("p").style("text-align", "center")
        .insert("button")
        .attr("id","reset_symb_display")
        .attr("class", "button_st4")
        .text(i18next.t("app_page.layer_style_popup.redraw_symbols"))
        .on("click", function(){
            selection.style("display", undefined);
        });

    let size_section = popup.append('p');
    size_section.append('span')
        .html('Symbol sizes (will be applyed to all symbols)');
    size_section.append('input')
        .attrs({min: 0,  max: 200, step: 'any', value: 32, type: 'number'})
        .styles({width: '60px', margin: 'auto'})
        .on('change', function(){
            let value = this.value;
            selection.transition()
                .attrs(function(){
                    let current_size = this.height.baseVal.value;
                    return {'width': value + 'px', 'height': value + 'px',
                            'x': this.x.baseVal.value + current_size / 2 - value / 2,
                            'y': this.y.baseVal.value + current_size / 2 - value / 2 };
                });
        })
}
//    popup.append("p").style("text-align", "center")
//            .insert("button")
//            .attr("id","modif_symb")
//            .attr("class", "button_st4")
//            .text(i18next.t("app_page.layer_style_popup.modify_symbols"))
//            .on("click", function(){
//                display_box_symbol_typo(ref_layer_name, rendered_field)().then(function(confirmed){
//                    if(confirmed){
//                        rendering_params = {
//                            nb_cat: confirmed[0],
//                            symbols_map: confirmed[1],
//                            field: rendered_field
//                        };
//                        map.select("#" + layer_name)
//                            .selectAll("image")
//                            .attr("x", d => d.coords[0] - rendering_params.symbols_map.get(d.Symbol_field)[1] / 2)
//                            .attr("y", d => d.coords[1] - rendering_params.symbols_map.get(d.Symbol_field)[1] / 2)
//                            .attr("width", d => rendering_params.symbols_map.get(d.Symbol_field)[1] + "px")
//                            .attr("height", d => rendering_params.symbols_map.get(d.Symbol_field)[1] + "px")
//                            .attr("xlink:href", (d,i) => rendering_params.symbols_map.get(d.Symbol_field)[0]);
//                    }
//                });
//            });
//
// }

function createStyleBoxLabel(layer_name){
    function get_prev_settings(){
        let features = selection._groups[0];
        prev_settings = [];
        for(let i = 0; i < features.length; i++){
            prev_settings.push({
                "color": features[i].style.fill,
                "size": features[i].style.fontSize,
                "display": features[i].style.display ? features[i].style.display : null,
                "position": [features[i].getAttribute("x"), features[i].getAttribute("y")],
                "font": features[i].style.fontFamily
                });
        }
        prev_settings_defaults = {
            "color": current_layers[layer_name].fill_color,
            "size": current_layers[layer_name].default_size,
            "font": current_layers[layer_name].default_font
        };
    };

    function restore_prev_settings(){
        let features = selection._groups[0];
        for(let i = 0; i < features.length; i++){
            features[i].style.fill = prev_settings[i]["color"];
            features[i].style.fontSize = prev_settings[i]["size"];
            features[i].style.display = prev_settings[i]["display"];
            features[i].setAttribute("x", prev_settings[i]["position"][0]);
            features[i].setAttribute("y", prev_settings[i]["position"][1]);
            features[i].style.fontFamily = prev_settings[i]["font"];
            features[i].__data__.properties.size = +prev_settings[i]["size"].replace('px', '');
        }

        current_layers[layer_name].fill_color = prev_settings_defaults.color;
        current_layers[layer_name].default_size = prev_settings_defaults.size;
        current_layers[layer_name].default_font = prev_settings_defaults.font;
    };

    let existing_box = document.querySelector(".styleBox");
    if(existing_box) existing_box.remove();

    var selection = svg_layers.select("#" + _app.layer_to_id.get(layer_name)).selectAll("text"),
        ref_layer_name = current_layers[layer_name].ref_layer_name;

    var prev_settings = [],
        prev_settings_defaults = {},
        rendering_params = {};

    get_prev_settings();

    make_confirm_dialog2("styleBox", layer_name, {top: true, widthFitContent: true, draggable: true})
        .then(function(confirmed){
            if(!confirmed){
                restore_prev_settings();
            }
        });
    var popup = d3.select(".styleBox").select(".modal-body").style("width", "295px");
    popup.append("p")
            .styles({"text-align": "center", "color": "grey"})
            .html([i18next.t("app_page.layer_style_popup.rendered_field", {field: current_layers[layer_name].rendered_field}),
                   i18next.t("app_page.layer_style_popup.reference_layer", {layer: ref_layer_name})].join(''));
    popup.append("p").style("text-align", "center")
            .insert("button")
            .attr("id","reset_labels_loc")
            .attr("class", "button_st4")
            .text(i18next.t("app_page.layer_style_popup.reset_labels_location"))
            .on("click", function(){
                selection.transition()
                    .attrs(d => {
                      let coords = path.centroid(d.geometry);
                      return {x: coords[0], y: coords[1]}
                    });
            });

    popup.append("p").style("text-align", "center")
            .insert("button")
            .attr("id","reset_labels_display")
            .attr("class", "button_st4")
            .text(i18next.t("app_page.layer_style_popup.redraw_labels"))
            .on("click", function(){
                selection.style("display", undefined);
            });

    popup.insert("p").style("text-align", "center").style("font-size", "9px")
            .html(i18next.t("app_page.layer_style_popup.overrride_warning"));
    let label_sizes = popup.append("p").attr("class", "line_elem");
    label_sizes.append("span")
            .html(i18next.t("app_page.layer_style_popup.labels_default_size"));
    label_sizes.insert("span")
            .style("float", "right")
            .html(" px");
    label_sizes.insert("input")
            .style("float", "right")
            .attr("type", "number")
            .attr("value", +current_layers[layer_name].default_size.replace("px", ""))
            .on("change", function(){
                let size = this.value + "px";
                current_layers[layer_name].default_size = size;
                selection.style("font-size", size);
                selection.each(d => { d.properties.size = this.value; });
            });

    let default_color = popup.insert("p").attr("class", "line_elem");
    default_color.append("span")
            .html(i18next.t("app_page.layer_style_popup.labels_default_color"));
    default_color.insert("input")
            .attrs({"type": "color", "value": current_layers[layer_name].fill_color})
            .on("change", function(){
                current_layers[layer_name].fill_color = this.value;
                selection.transition().style("fill", this.value);
            });

    let font_section = popup.insert("p").attr("class", "line_elem")
    font_section.append("span").html(i18next.t("app_page.layer_style_popup.labels_default_font"));
    let choice_font = font_section.insert("select")
            .style("float", "right")
            .on("change", function(){
                current_layers[layer_name].default_font = this.value;
                selection.transition().style("font-family", this.value);
            });

    available_fonts.forEach( name => {
        choice_font.append("option").attr("value", name[1]).text(name[0]);
    });
    choice_font.node().value = current_layers[layer_name].default_font;
}

function createStyleBoxGraticule(layer_name){
    let existing_box = document.querySelector(".styleBox");
    if(existing_box) existing_box.remove();
    let current_params = cloneObj(current_layers["Graticule"]);
    let selection = svg_layers.select("#Graticule > path");
    let selection_strokeW = svg_layers.select("#Graticule");

    make_confirm_dialog2("styleBox", layer_name, {top: true, widthFitContent: true, draggable: true})
        .then(function(confirmed){
            if(confirmed){ null; } else { null; }
        });

    let popup = d3.select(".styleBox").select(".modal-body").style("width", "295px");
    let color_choice = popup.append("p").attr("class", "line_elem");
    color_choice.append("span").html(i18next.t("app_page.layer_style_popup.color"));
    color_choice.append("input")
            .style("float", "right")
            .attrs({type: "color", value: current_params.fill_color.single})
            .on("change", function(){
                selection.style("stroke", this.value);
                current_layers["Graticule"].fill_color.single = this.value;
            });

    let opacity_choice = popup.append("p").attr("class", "line_elem");
    opacity_choice.append("span").html(i18next.t("app_page.layer_style_popup.opacity"));
    opacity_choice.append("input")
            .attrs({type: "range", value: current_params.opacity, min: 0, max: 1, step: 0.1})
            .styles({"width": "58px", "vertical-align": "middle", "display": "inline", "float": "right"})
            .on("change", function(){
                selection.style("stroke-opacity", this.value);
                current_layers["Graticule"].opacity = +this.value;
                popup.select("#graticule_opacity_txt").html((+this.value * 100) + "%")
            });
    opacity_choice.append("span")
            .attr("id", "graticule_opacity_txt")
            .style("float", "right")
            .html((current_params.opacity * 100) + '%');

    let stroke_width_choice = popup.append("p").attr("class", "line_elem");
    stroke_width_choice.append("span").html(i18next.t("app_page.layer_style_popup.width"));
    stroke_width_choice.append("input")
            .attrs({type: "number", value: current_params["stroke-width-const"]})
            .styles({"width": "60px", "float": "right"})
            .on("change", function(){
                selection_strokeW.style("stroke-width", this.value)
                current_layers["Graticule"]["stroke-width-const"] = +this.value;
            });

    let steps_choice = popup.append("p").attr("class", "line_elem");
    steps_choice.append("span").html(i18next.t("app_page.layer_style_popup.graticule_steps"));
    steps_choice.append("input")
            .attrs({id: "graticule_range_steps", type: "range", value: current_params.step, min: 0, max: 100, step: 1})
            .styles({"vertical-align": "middle", "width": "58px", "display": "inline", "float": "right"})
            .on("change", function(){
                let step_val = +this.value,
                    dasharray_val = +document.getElementById("graticule_dasharray_txt").value;
                current_layers["Graticule"].step = step_val;
                svg_layers.select("#Graticule").remove()
                svg_layers.append("g").attrs({id: "Graticule", class: "layer"})
                    .append("path")
                    .datum(d3.geoGraticule().step([step_val, step_val]))
                    .attrs({class: "graticule", d: path, "clip-path": "url(#clip)"})
                    .styles({fill: "none", "stroke": current_layers["Graticule"].fill_color.single, "stroke-dasharray": dasharray_val});
                zoom_without_redraw();
                selection = svg_layers.select("#Graticule").selectAll("path");
                selection_strokeW = svg_layers.select("#Graticule");
                popup.select("#graticule_step_txt").attr("value", step_val);
            });
    steps_choice.append("input")
            .attrs({type: "number", value: current_params.step, min: 0, max: 100, step: "any", class: "without_spinner", id: "graticule_step_txt"})
            .styles({width: "30px", "margin-left": "10px", "float": "right"})
            .on("change", function(){
                let grat_range = document.getElementById("graticule_range_steps");
                grat_range.value = +this.value;
                grat_range.dispatchEvent(new MouseEvent("change"));
            });

    let dasharray_choice = popup.append("p").attr("class", "line_elem");
    dasharray_choice.append("span").html(i18next.t("app_page.layer_style_popup.graticule_dasharray"));
    dasharray_choice.append("input")
            .attrs({type: "range", value: current_params.step, min: 0, max: 50, step: 0.1, id: "graticule_range_dasharray"})
            .styles({"vertical-align": "middle", "width": "58px", "display": "inline", "float": "right"})
            .on("change", function(){
                selection.style("stroke-dasharray", this.value);
                current_layers["Graticule"].dasharray = +this.value;
                popup.select("#graticule_dasharray_txt").attr("value", this.value);
            });
    dasharray_choice.append("input")
            .attrs({type: "number", value: current_params.step, min: 0, max: 100, step: "any", class: "without_spinner", id: "graticule_dasharray_txt"})
            .styles({width: "30px", "margin-left": "10px", "float": "right"})
            .on("change", function(){
                let grat_range = document.getElementById("graticule_range_dasharray");
                grat_range.value = +this.value;
                grat_range.dispatchEvent(new MouseEvent("change"));
            });
}

function createStyleBox(layer_name){
    let existing_box = document.querySelector(".styleBox");
    if(existing_box) existing_box.remove();
    var type = current_layers[layer_name].type,
        rendering_params = null,
        renderer = current_layers[layer_name].renderer,
        g_lyr_name = "#" + _app.layer_to_id.get(layer_name),
        selection = svg_layers.select(g_lyr_name).selectAll("path"),
        opacity = selection.style('fill-opacity');

    var lgd_to_change;

    var fill_prev = cloneObj(current_layers[layer_name].fill_color),
        prev_col_breaks;

    if(current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array)
        prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);


    var stroke_prev = selection.style('stroke'),
        border_opacity = selection.style('stroke-opacity'),
        stroke_width = +current_layers[layer_name]['stroke-width-const'],
        prev_min_display, prev_size, prev_breaks;

    if(stroke_prev.startsWith("rgb"))
        stroke_prev = rgb2hex(stroke_prev);

    var table = [];
    Array.prototype.forEach.call(layers_node.querySelector(g_lyr_name).querySelectorAll('path'), d => {
        table.push(d.__data__.properties);
    });
    if(layer_name != "Sphere")
        var fields_layer = current_layers[layer_name].fields_type || type_col2(table);
    else {
        var fields_layer = [];
    }
    make_confirm_dialog2("styleBox", layer_name, {top: true, widthFitContent: true, draggable: true})
        .then(function(confirmed){
            if(confirmed){
                // Update the object holding the properties of the layer if Yes is clicked
                if(type === "Point" && !renderer) {
                    current_layers[layer_name].pointRadius = +current_pt_size;
                }
                if(renderer != undefined
                     && rendering_params != undefined && renderer != "Stewart" && renderer != "Categorical"){
                    current_layers[layer_name].fill_color = {"class": rendering_params.colorsByFeature};
                    let colors_breaks = [];
                    for(let i = rendering_params['breaks'].length-1; i > 0; --i){
                        colors_breaks.push([
                            [rendering_params['breaks'][i-1], " - ", rendering_params['breaks'][i]].join(''),
                            rendering_params['colors'][i-1]
                            ]);
                    }
                    current_layers[layer_name].colors_breaks = colors_breaks;
                    current_layers[layer_name].rendered_field = rendering_params.field;
                    current_layers[layer_name].options_disc = {
                            schema: rendering_params.schema,
                            colors: rendering_params.colors,
                            no_data: rendering_params.no_data,
                            type: rendering_params.type,
                            breaks: rendering_params.breaks
                          };
                } else if (renderer == "Stewart"){
                    current_layers[layer_name].colors_breaks = rendering_params.breaks;
                    current_layers[layer_name].fill_color.class =  rendering_params.breaks.map(obj => obj[1]);
                } else if (renderer == "Categorical"){
                    current_layers[layer_name].color_map = rendering_params.color_map;
                    current_layers[layer_name].fill_color = {'class': [].concat(rendering_params.colorsByFeature)};
                } else if (renderer == "DiscLayer"){
                    selection.each(function(d){
                        d.properties.prop_val = this.style.strokeWidth;
                    });
                } else if (renderer == "Links"){
                    selection.each(function(d, i) {
                        current_layers[layer_name].linksbyId[i][2] = this.style.strokeWidth;
                    })
                }
                // Also change the legend if there is one displayed :
                let _type_layer_links = (renderer == "DiscLayer" || renderer == "Links")
                let lgd = document.querySelector(
                    [_type_layer_links ? "#legend_root_links.lgdf_" : "#legend_root.lgdf_", layer_name].join('')
                    );
                if(lgd && (lgd_to_change || rendering_params)){
                    let transform_param = lgd.getAttribute("transform"),
                        lgd_title = lgd.querySelector("#legendtitle").innerHTML,
                        lgd_subtitle = lgd.querySelector("#legendsubtitle").innerHTML,
                        rounding_precision = lgd.getAttribute("rounding_precision"),
                        boxgap = lgd.getAttribute("boxgap");

                    if(_type_layer_links){
                        lgd.remove();
                        createLegend_discont_links(layer_name, current_layers[layer_name].rendered_field, lgd_title, lgd_subtitle, undefined, rounding_precision);
                    } else {
                        let no_data_txt = document.getElementById("no_data_txt");
                        no_data_txt = no_data_txt != null ? no_data_txt.textContent : null;
                        lgd.remove();
                        createLegend_choro(layer_name, rendering_params.field, lgd_title, lgd_subtitle, boxgap, undefined, rounding_precision, no_data_txt);
                    }
                    lgd = document.querySelector(
                        [_type_layer_links ? "#legend_root_links.lgdf_" : "#legend_root.lgdf_", layer_name].join('')
                        );
                    if(transform_param)
                        lgd.setAttribute("transform", transform_param);
                }
                zoom_without_redraw();
            } else {
                // Reset to original values the rendering parameters if "no" is clicked
                selection.style('fill-opacity', opacity)
                         .style('stroke-opacity', border_opacity);
                let zoom_scale = +d3.zoomTransform(svg_map).k;
                svg_layers.select(g_lyr_name).style('stroke-width', stroke_width/zoom_scale + "px");
                current_layers[layer_name]['stroke-width-const'] = stroke_width;
                let fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
                if(type === "Point" && !renderer) {
                    selection.attr("d", path.pointRadius(+current_layers[layer_name].pointRadius))
                } else if(type == "Line"){
                    if(current_layers[layer_name].renderer == "Links" && prev_min_display != undefined){
                        current_layers[layer_name].min_display = prev_min_display;
                        current_layers[layer_name].breaks = prev_breaks;
                        selection.style('fill-opacity', 0)
                                 .style("stroke", fill_prev.single)
                                 .style("display", d => (+d.properties.fij > prev_min_display) ? null : "none")
                                 .style("stroke-opacity", border_opacity)
                                 .style("stroke-width", (d,i) => current_layers[layer_name].linksbyId[i][2]);
                    } else if (current_layers[layer_name].renderer == "DiscLayer" && prev_min_display != undefined){
                        current_layers[layer_name].min_display = prev_min_display;
                        current_layers[layer_name].size = prev_size;
                        current_layers[layer_name].breaks = prev_breaks;
                        let lim = prev_min_display != 0 ? prev_min_display * current_layers[layer_name].n_features : -1;
                        selection.style('fill-opacity', 0)
                                 .style("stroke", fill_prev.single)
                                 .style("stroke-opacity", border_opacity)
                                 .style("display", (d,i) => +i <= lim ? null : "none" )
                                 .style('stroke-width', d => d.properties.prop_val);
                    } else {
                        if(fill_meth == "single")
                            selection.style("stroke", fill_prev.single)
                                     .style("stroke-opacity", border_opacity);
                        else if(fill_meth == "random")
                            selection.style("stroke-opacity", border_opacity)
                                     .style("stroke", () => Colors.name[Colors.random()]);
                        else if(fill_meth == "class" && renderer == "Links")
                            selection.style('stroke-opacity', (d,i) => current_layers[layer_name].linksbyId[i][0])
                                     .style("stroke", stroke_prev);
                    }
                } else {
                    if(current_layers[layer_name].renderer == "Stewart"){
                        recolor_stewart(prev_palette.name, prev_palette.reversed);
                    } else if(fill_meth == "single") {
                        selection.style('fill', fill_prev.single)
                                 .style('stroke', stroke_prev);
                    } else if(fill_meth == "class") {
                        selection.style('fill-opacity', opacity)
                               .style("fill", function(d, i){ return fill_prev.class[i] })
                               .style('stroke-opacity', border_opacity)
                               .style("stroke", stroke_prev);
                    } else if(fill_meth == "random"){
                        selection.style('fill', function(){return Colors.name[Colors.random()];})
                                 .style('stroke', stroke_prev);
                    } else if(fill_meth == "categorical"){
                        fill_categorical(layer_name, fill_prev.categorical[0], "path", fill_prev.categorical[1])
                    }
                }
                if(current_layers[layer_name].colors_breaks)
                    current_layers[layer_name].colors_breaks = prev_col_breaks;
                current_layers[layer_name].fill_color = fill_prev;
                zoom_without_redraw();
            }
    });

    var popup = d3.select(".styleBox").select(".modal-body").style("width", "295px");

    if(type === "Point" && !renderer){
        var current_pt_size = current_layers[layer_name].pointRadius;
        let pt_size = popup.append("p").attr("class", "line_elem");
        pt_size.append("span").html(i18next.t("app_page.layer_style_popup.point_radius"));
        pt_size.append("input")
                .attrs({type: "range", min: 0, max: 40, value: current_pt_size})
                .styles({"width": "58px", "vertical-align": "middle", "display": "inline", "float": "right", "margin-right": "0px"})
                .on("change", function(){
                    current_pt_size = +this.value;
                    document.getElementById("txt_pt_radius").innerHTML = current_pt_size;
                    selection.attr("d", path.pointRadius(current_pt_size));
                });
        pt_size.append("span")
                .attr("id", "txt_pt_radius")
                .style("float", "right")
                .html(current_pt_size + "");
    }

     if(type !== 'Line'){
        if(current_layers[layer_name].colors_breaks == undefined && renderer != "Categorical"){
            if(current_layers[layer_name].targeted || current_layers[layer_name].is_result){
                let fields =  getFieldsType('category', null, fields_layer);
                let fill_method = popup.append("p").html(i18next.t("app_page.layer_style_popup.fill_color")).insert("select");
                [[i18next.t("app_page.layer_style_popup.single_color"), "single"],
                 [i18next.t("app_page.layer_style_popup.categorical_color"), "categorical"],
                 [i18next.t("app_page.layer_style_popup.random_color"), "random"]].forEach(function(d,i){
                        fill_method.append("option").text(d[0]).attr("value", d[1])  });
                popup.append('div').attrs({id: "fill_color_section"})
                fill_method.on("change", function(){
                    d3.select("#fill_color_section").html("").on("click", null);
                    if (this.value == "single")
                        make_single_color_menu(layer_name, fill_prev);
                    else if (this.value == "categorical")
                        make_categorical_color_menu(fields, layer_name, fill_prev);
                    else if (this.value == "random")
                        make_random_color(layer_name);
                    });
                setSelected(fill_method.node(), Object.getOwnPropertyNames(fill_prev)[0])
            } else {
                popup.append('div').attrs({id: "fill_color_section"})
                make_single_color_menu(layer_name, fill_prev);
            }
        } else if (renderer == "Categorical"){
            let rendered_field = current_layers[layer_name].rendered_field;

            popup.insert('p').style("margin", "auto").html("")
                .append("button")
                .attr("class", "button_disc")
                .styles({"font-size": "0.8em", "text-align": "center"})
                .html(i18next.t("app_page.layer_style_popup.choose_colors"))
                .on("click", function(){
                    let [cats, _] = prepare_categories_array(layer_name, rendered_field, current_layers[layer_name].color_map);
                    display_categorical_box(result_data[layer_name], layer_name, rendered_field, cats)
                        .then(function(confirmed){
                            if(confirmed){
                                rendering_params = {
                                        nb_class: confirmed[0], color_map :confirmed[1], colorsByFeature: confirmed[2],
                                        renderer:"Categorical", rendered_field: rendered_field
                                    };
                                selection.transition()
                                    .style('fill', (d,i) => rendering_params.colorsByFeature[i]);
                                lgd_to_change = true;
                            }
                        });
                });
        } else if (renderer == "Choropleth"){
            popup.append('p').styles({margin: 'auto', 'text-align': 'center'})
                .append("button")
                .attr("class", "button_disc")
                .html(i18next.t("app_page.layer_style_popup.choose_discretization"))
                .on("click", function(){
                    display_discretization(layer_name,
                                           current_layers[layer_name].rendered_field,
                                           current_layers[layer_name].colors_breaks.length,
                                          //  "quantiles",
                                           current_layers[layer_name].options_disc)
                       .then(function(confirmed){
                           if(confirmed){
                               rendering_params = {
                                   nb_class: confirmed[0],
                                   type: confirmed[1],
                                   breaks: confirmed[2],
                                   colors:confirmed[3],
                                   colorsByFeature: confirmed[4],
                                   schema: confirmed[5],
                                   no_data: confirmed[6],
                                  //  renderer:"Choropleth",
                                   field: current_layers[layer_name].rendered_field
                               };
                               let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
                               selection.transition()
                                   .style("fill", (d,i) => rendering_params.colorsByFeature[i]);
                           }
                       });
               });

        } else if (renderer == "Gridded"){
            let field_to_discretize = "densitykm";
            popup.append('p').style("margin", "auto").style("text-align", "center")
                .append("button")
                .attr("class", "button_disc")
                .html(i18next.t("app_page.layer_style_popup.choose_discretization"))
                .on("click", function(){
                    display_discretization(layer_name,
                                           field_to_discretize,
                                           current_layers[layer_name].colors_breaks.length,
                                          //  "quantiles",
                                           current_layers[layer_name].options_disc)
                        .then(function(confirmed){
                            if(confirmed){
                                rendering_params = {
                                    nb_class: confirmed[0],
                                    type: confirmed[1],
                                    breaks: confirmed[2],
                                    colors:confirmed[3],
                                    colorsByFeature: confirmed[4],
                                    schema: confirmed[5],
                                    no_data: confirmed[6],
                                    renderer:"Choropleth",
                                    field: field_to_discretize
                                };
                                let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
                                selection.transition()
                                    .style("fill", (d,i) => rendering_params.colorsByFeature[i]);
                            }
                        });
                });
         } else if (renderer == "Stewart"){
            let field_to_colorize = "min",
                nb_ft = current_layers[layer_name].n_features;
            var prev_palette = cloneObj(current_layers[layer_name].color_palette);
            rendering_params = {breaks: [].concat(current_layers[layer_name].colors_breaks)};

            var recolor_stewart = function(coloramp_name, reversed){
                let new_coloramp = getColorBrewerArray(nb_ft, coloramp_name);
                if(reversed) new_coloramp.reverse();
                for(let i=0; i < nb_ft; ++i)
                    rendering_params.breaks[i][1] = new_coloramp[i];
                selection.transition().style("fill", (d,i) => new_coloramp[i] );
                current_layers[layer_name].color_palette = {name: coloramp_name, reversed: reversed};
            }

            var color_palette_section = popup.insert("p").attr("class", "line_elem");
            color_palette_section.append("span").html(i18next.t("app_page.layer_style_popup.color_palette"));
            let seq_color_select = color_palette_section.insert("select")
                                        .attr("id", "coloramp_params")
                                        .style('float', 'right')
                                        .on("change", function(){
                                            recolor_stewart(this.value, false);
                                         });

            ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
             'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'].forEach(name => {
                seq_color_select.append("option").text(name).attr("value", name);
            });
            seq_color_select.node().value = prev_palette.name;
            popup.insert('p')
                .attr('class', 'line_elem')
                .styles({'text-align': 'center', 'margin': '0 !important'})
                .insert("button")
                .attrs({"class": "button_st3", "id": "reverse_colramp"})
                .html(i18next.t("app_page.layer_style_popup.reverse_palette"))
                .on("click", function(){
                    let pal_name = document.getElementById("coloramp_params").value;
                    recolor_stewart(pal_name, true);
                 });
        }
        let fill_opacity_section = popup.append('p').attr("class", "line_elem");
        fill_opacity_section.append("span")
            .html(i18next.t("app_page.layer_style_popup.fill_opacity"))
        fill_opacity_section.insert('input')
            .attrs({type: "range", min: 0, max: 1, step: 0.1, value: opacity})
            .styles({"width": "58px", "vertical-align": "middle", "display": "inline", "float": "right",  "margin-right": "0px"})
            .on('change', function(){
              selection.style('fill-opacity', this.value)
              fill_opacity_section.select("#fill_opacity_txt").html((+this.value * 100) + "%")
            });
        fill_opacity_section.append("span")
                        .style("float", "right")
                        .attr("id", "fill_opacity_txt")
                        .html((+opacity * 100) + "%");
    } else if (type === "Line" && renderer == "Links"){
        prev_min_display = current_layers[layer_name].min_display || 0;
        prev_breaks = current_layers[layer_name].breaks.slice();
        let max_val = 0;
        selection.each(function(d){if(+d.properties.fij > max_val) max_val = d.properties.fij;})
        let threshold_section = popup.append('p').attr("class", "line_elem");
        threshold_section.append("span").html(i18next.t("app_page.layer_style_popup.display_flow_larger"));
        // The legend will be updated in order to start on the minimum value displayed instead of
        //   using the minimum value of the serie (skipping unused class if necessary)
        threshold_section.insert('input')
            .attrs({type: 'range', min: 0, max: max_val, step: 0.5, value: prev_min_display})
            .styles({width: "58px", "vertical-align": "middle", "display": "inline", "float": "right",  "margin-right": "0px"})
            .on("change", function(){
                lgd_to_change = true;
                let val = +this.value;
                popup.select("#larger_than").html(["<i> ", val, " </i>"].join(''));
                selection.style("display", d => (+d.properties.fij > val) ? null : "none");
                current_layers[layer_name].min_display = val;
            });
        threshold_section.insert('label')
            .attr("id", "larger_than")
            .style("float", "right")
            .html(["<i> ", prev_min_display, " </i>"].join(''));
        popup.append('p').style('text-align', 'center')
            .append("button")
                .attr("class", "button_disc")
                .html(i18next.t("app_page.layer_style_popup.modify_size_class"))
                .on("click", function(){
                    display_discretization_links_discont(layer_name,
                                                         current_layers[layer_name].rendered_field,
                                                         current_layers[layer_name].breaks.length,
                                                         "user_defined")
                        .then(function(result){
                            if(result){
                                let serie = result[0],
                                    sizes = result[1].map(ft => ft[1]),
                                    links_byId = current_layers[layer_name].linksbyId;

                                lgd_to_change = true;
                                serie.setClassManually(result[2]);
                                current_layers[layer_name].breaks = result[1];
                                selection.style('fill-opacity', 0)
                                         .style("stroke-width", (d,i) => sizes[serie.getClass(+links_byId[i][1])]);
                            }
                        });
                });
     } else if (type === "Line" && renderer == "DiscLayer"){
        prev_min_display = current_layers[layer_name].min_display || 0;
        prev_size = current_layers[layer_name].size.slice();
        prev_breaks = current_layers[layer_name].breaks.slice();
        let max_val = Math.max.apply(null, result_data[layer_name].map( i => i.disc_value));
        let disc_part = popup.append("p").attr("class", "line_elem");
        disc_part.append("span").html(i18next.t("app_page.layer_style_popup.discont_threshold"));
        disc_part.insert("input")
            .attrs({type: "range", min: 0, max: 1, step: 0.1, value: prev_min_display})
            .styles({width: "58px", "vertical-align": "middle", "display": "inline", "float": "right", "margin-right": "0px"})
            .on("change", function(){
                lgd_to_change = true;
                let val = +this.value;
                let lim = val != 0 ? val * current_layers[layer_name].n_features : -1;
                popup.select("#larger_than").html(["<i> ", val * 100, " % </i>"].join(''));
                selection.style("display", (d,i) => i <= lim ? null : "none" );
                current_layers[layer_name].min_display = val;
            });
        disc_part.insert('label')
            .attr("id", "larger_than")
            .style("float", "right")
            .html(["<i> ", prev_min_display * 100, " % </i>"].join(''));
        popup.append('p').style('text-align', 'center')
            .append("button")
            .attr("class", "button_disc")
            .html(i18next.t("app_page.layer_style_popup.choose_discretization"))
            .on("click", function(){
                display_discretization_links_discont(layer_name,
                                                     "disc_value",
                                                     current_layers[layer_name].breaks.length,
                                                     "user_defined")
                    .then(function(result){
                        if(result){
                            let serie = result[0],
                                sizes = result[1].map(ft => ft[1]);

                            lgd_to_change = true;
                            serie.setClassManually(result[2]);
                            current_layers[layer_name].breaks = result[1];
                            current_layers[layer_name].size = [sizes[0], sizes[sizes.length - 1]];
                            selection.style('fill-opacity', 0)
                                    .style("stroke-width", (d,i) => sizes[serie.getClass(+d.properties.disc_value)]);
                        }
                    });
            });
    }
    let c_section = popup.append('p').attr("class", "line_elem");
    c_section.insert("span")
        .html(type === 'Line' ? i18next.t("app_page.layer_style_popup.color") : i18next.t("app_page.layer_style_popup.border_color"));
    c_section.insert('input')
        .attrs({type: "color", value: stroke_prev})
        .style("float", "right")
        .on('change', function(){
            lgd_to_change = true;
            selection.style("stroke", this.value);
            current_layers[layer_name].fill_color.single = this.value;
        });

    let opacity_section = popup.append('p').attr("class", "line_elem");
    opacity_section.insert("span")
        .html(type === 'Line' ? i18next.t("app_page.layer_style_popup.opacity") : i18next.t("app_page.layer_style_popup.border_opacity"));
    opacity_section.insert('input')
        .attrs({type: "range", min: 0, max: 1, step: 0.1, value: border_opacity})
        .styles({"width": "58px", "vertical-align": "middle", "display": "inline", "float": "right"})
        .on('change', function(){
            opacity_section.select("#opacity_val_txt").html(" " + this.value);
            selection.style('stroke-opacity', this.value);
        });

    opacity_section.append("span").attr("id", "opacity_val_txt")
         .style("display", "inline").style("float", "right")
         .html(" " + border_opacity);

    if(renderer != "DiscLayer" && renderer != "Links"){
        let width_section = popup.append('p');
        width_section.append("span")
            .html(type === 'Line' ? i18next.t("app_page.layer_style_popup.width") : i18next.t("app_page.layer_style_popup.border_width"));
        width_section.insert('input')
            .attrs({type: "number", min: 0, step: 0.1, value: stroke_width})
            .styles({"width": "60px", "float": "right"})
            .on('change', function(){
                let val = +this.value;
                let zoom_scale = +d3.zoomTransform(svg_map).k;
                svg_layers.select(g_lyr_name).style("stroke-width", (val / zoom_scale) + "px");
                current_layers[layer_name]['stroke-width-const'] = val;
              });
    }

    let _fields = get_fields_name(layer_name);
    if(_fields && _fields.length > 0){
      let labels_section = popup.append("p");
      let input_fields = {};
      for(let i = 0; i < _fields.length; i++){
        input_fields[_fields[i]] = _fields[i];
      }
      labels_section.append("span")
            .attr("id", "generate_labels")
            .styles({"cursor": "pointer", "margin-top": "15px"})
            .html(i18next.t("app_page.layer_style_popup.generate_labels"))
            .on("mouseover", function(){
              this.style.fontWeight = "bold"
            })
            .on("mouseout", function(){
              this.style.fontWeight = "";
            })
            .on("click", function(){
              let fields =
              swal({
                  title: "",
                  text: i18next.t("app_page.layer_style_popup.field_label"),
                  type: "question",
                  customClass: 'swal2_custom',
                  showCancelButton: true,
                  showCloseButton: false,
                  allowEscapeKey: false,
                  allowOutsideClick: false,
                  confirmButtonColor: "#DD6B55",
                  confirmButtonText: i18next.t("app_page.common.confirm"),
                  input: 'select',
                  inputPlaceholder: i18next.t("app_page.common.field"),
                  inputOptions: input_fields,
                  inputValidator: function(value) {
                      return new Promise(function(resolve, reject){
                          if(_fields.indexOf(value) < 0){
                              reject(i18next.t("app_page.common.no_value"));
                          } else {
                            let options_labels = {
                              label_field: value,
                              color: "#000",
                              font: "Arial,Helvetica,sans-serif",
                              ref_font_size: 12,
                              uo_layer_name: ["Labels", value, layer_name].join('_')
                            };
                            render_label(layer_name, options_labels);
                            resolve();
                          }
                      });
                  }
                }).then( value => {
                      console.log(value);
                  }, dismiss => {
                      console.log(dismiss);
                  });
            });
    }
}

function get_fields_name(layer_name){
  let elem = document.getElementById(_app.layer_to_id.get(layer_name)).childNodes[0];
  if(!elem.__data__ || !elem.__data__.properties){
    return null;
  } else {
    return Object.getOwnPropertyNames(elem.__data__.properties);
  }
}

function createStyleBox_ProbSymbol(layer_name){
    let existing_box = document.querySelector(".styleBox");
    if(existing_box) existing_box.remove();

    var g_lyr_name = "#" + _app.layer_to_id.get(layer_name),
        ref_layer_name = current_layers[layer_name].ref_layer_name,
        type_method = current_layers[layer_name].renderer,
        type_symbol = current_layers[layer_name].symbol,
        field_used = current_layers[layer_name].rendered_field,
        selection = svg_layers.select(g_lyr_name).selectAll(type_symbol),
        rendering_params,
        old_size = [current_layers[layer_name].size[0],
                    current_layers[layer_name].size[1]];

    var stroke_prev = selection.style('stroke'),
        opacity = selection.style('fill-opacity'),
        border_opacity = selection.style('stroke-opacity'),
        stroke_width = selection.style('stroke-width');

    var fill_prev = cloneObj(current_layers[layer_name].fill_color),
        prev_col_breaks;

    var ratio = proj.scale() / current_layers[layer_name].proj_scale_draw;

    var d_values = result_data[layer_name].map(v => +v[field_used]);

    let redraw_prop_val = function(prop_values){
        let selec = selection._groups[0];

        if(type_symbol === "circle") {
            for(let i=0, len = prop_values.length; i < len; i++){
                selec[i].setAttribute('r', prop_values[i] * ratio)
            }
        } else if(type_symbol === "rect") {
            for(let i=0, len = prop_values.length; i < len; i++){
                let old_rect_size = +selec[i].getAttribute('height'),
                    v = ratio * prop_values[i],
                    centr = [+selec[i].getAttribute("x") + (old_rect_size/2) - (v / 2),
                             +selec[i].getAttribute("y") + (old_rect_size/2) - (v / 2)];

                selec[i].setAttribute('x', centr[0]);
                selec[i].setAttribute('y', centr[1]);
                selec[i].setAttribute('height', v);
                selec[i].setAttribute('width', v);
            }
        }
    }

    if(current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array)
        prev_col_breaks = [].concat(current_layers[layer_name].colors_breaks);
    else if(current_layers[layer_name].break_val != undefined)
        prev_col_breaks = current_layers[layer_name].break_val;

    if(stroke_prev.startsWith("rgb")) stroke_prev = rgb2hex(stroke_prev)
    if(stroke_width.endsWith("px")) stroke_width = stroke_width.substring(0, stroke_width.length-2);

    make_confirm_dialog2("styleBox", layer_name, {top: true, widthFitContent: true, draggable: true})
        .then(function(confirmed){
            if(confirmed){
                if(current_layers[layer_name].size != old_size){
                    let lgd_prop_symb = document.querySelector(["#legend_root2.lgdf_", layer_name].join(''));
                    if(lgd_prop_symb){ redraw_legends_symbols(lgd_prop_symb); }
                    if(type_symbol === "circle") {
                        selection.each(function(d,i){
                            d.properties.prop_value = this.getAttribute('r');
                        });
                    } else {
                        selection.each(function(d,i){
                            d.properties.prop_value = this.getAttribute('height');
                        });
                    }
                }
                if(type_method == "PropSymbolsChoro" || type_method == "PropSymbolsTypo"){
                    if(type_method == "PropSymbolsChoro"){
                        current_layers[layer_name].fill_color = {"class": [].concat(rendering_params.colorsByFeature) };
                        current_layers[layer_name].colors_breaks = [];
                        for(let i = rendering_params['breaks'].length-1; i > 0; --i){
                            current_layers[layer_name].colors_breaks.push([
                                [rendering_params['breaks'][i-1], " - ", rendering_params['breaks'][i]].join(''),
                                rendering_params['colors'][i-1]
                                ]);
                        }
                        current_layers[layer_name].options_disc = {
                                schema: rendering_params.schema,
                                colors: rendering_params.colors,
                                no_data: rendering_params.no_data,
                                type: rendering_params.type,
                                breaks: rendering_params.breaks
                              };

                    } else if (type_method == "PropSymbolsTypo"){
                        current_layers[layer_name].fill_color = {'class': [].concat(rendering_params.colorsByFeature) };
                        current_layers[layer_name].color_map = rendering_params.color_map;
                    }
                    current_layers[layer_name].rendered_field2 = rendering_params.field;
                    // Also change the legend if there is one displayed :
                    let lgd_choro = document.querySelector(["#legend_root.lgdf_", layer_name].join(''));
                    if(lgd_choro){
                        let transform_param = lgd_choro.getAttribute("transform"),
                            lgd_title = lgd_choro.querySelector("#legendtitle").innerHTML,
                            lgd_subtitle = lgd_choro.querySelector("#legendsubtitle").innerHTML,
                            boxgap = lgd_choro.getAttribute("boxgap");
                        lgd_choro.remove();
                        createLegend_choro(layer_name, rendering_params.field, lgd_title, lgd_subtitle, boxgap);
                        lgd_choro = document.querySelector(["#legend_root.lgdf_", layer_name].join(''));
                        if(transform_param)
                            lgd_choro.setAttribute("transform", transform_param);
                    }
                }
                if(selection._groups[0][0].__data__.properties.color){
                    selection.each((d,i) => {
                        d.properties.color = rendering_params.colorsByFeature[i];
                    });
                }
            } else {
                selection.style('fill-opacity', opacity);
                svg_layers.select(g_lyr_name).style('stroke-width', stroke_width);
                current_layers[layer_name]['stroke-width-const'] = stroke_width;
                let fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
                if(fill_meth == "single") {
                    selection.style('fill', fill_prev.single)
                             .style('stroke-opacity', border_opacity)
                             .style('stroke', stroke_prev);
                } else if(fill_meth == "two") {
                    current_layers[layer_name].break_val = prev_col_breaks;
                    current_layers[layer_name].fill_color = {"two": [fill_prev.two[0], fill_prev.two[1]]};
                    selection.style('fill', (d,i) => d_values[i] > prev_col_breaks ? fill_prev.two[1] : fill_prev.two[0])
                             .style('stroke-opacity', border_opacity)
                             .style('stroke', stroke_prev);
                } else if(fill_meth == "class") {
                    selection.style('fill-opacity', opacity)
                           .style("fill", function(d, i){ return current_layers[layer_name].fill_color.class[i] })
                           .style('stroke-opacity', border_opacity)
                           .style("stroke", stroke_prev);
                    current_layers[layer_name].colors_breaks = prev_col_breaks;
                } else if(fill_meth == "random"){
                    selection.style('fill', function(){return Colors.name[Colors.random()];})
                             .style('stroke-opacity', border_opacity)
                             .style('stroke', stroke_prev);
                } else if(fill_meth == "categorical"){
                    fill_categorical(layer_name, fill_prev.categorical[0],
                                     type_symbol, fill_prev.categorical[1])
                }
                current_layers[layer_name].fill_color = fill_prev;
                if(current_layers[layer_name].size[1] != old_size[1]){
                    let prop_values = prop_sizer3_e(d_values, old_size[0], old_size[1], type_symbol);
                    redraw_prop_val(prop_values);
                    current_layers[layer_name].size = [old_size[0], old_size[1]];
                }
            }
            zoom_without_redraw();
        });

    var popup = d3.select(".styleBox").select(".modal-body").style("width", "295px");
    popup.append("p")
            .styles({"text-align": "center", "color": "grey"})
            .html([i18next.t("app_page.layer_style_popup.rendered_field", {field: current_layers[layer_name].rendered_field}),
                   i18next.t("app_page.layer_style_popup.reference_layer", {layer: ref_layer_name})].join(''));
    if(type_method === "PropSymbolsChoro"){
        let field_color = current_layers[layer_name].rendered_field2;
        popup.append('p').style("margin", "auto").html(i18next.t("app_page.layer_style_popup.field_symbol_color", {field: field_color}))
            .append("button").attr("class", "button_disc").html(i18next.t("app_page.layer_style_popup.choose_discretization"))
            .on("click", function(){
                display_discretization(layer_name,
                                       field_color,
                                       current_layers[layer_name].colors_breaks.length,
                                      //  "quantiles",
                                       current_layers[layer_name].options_disc)
                  .then(function(confirmed){
                    if(confirmed){
                        rendering_params = {
                          nb_class: confirmed[0],
                          type: confirmed[1],
                          breaks: confirmed[2],
                          colors:confirmed[3],
                          colorsByFeature: confirmed[4],
                          schema: confirmed[5],
                          no_data: confirmed[6],
                          renderer:"PropSymbolsChoro",
                          field: field_color
                          };
                        selection.style("fill", (d,i) => rendering_params.colorsByFeature[i]);
                    }
                });
        });
    } else if(current_layers[layer_name].break_val != undefined){
        let fill_color_section = popup.append('div').attr("id", "fill_color_section");
        fill_color_section.append("p")
                    .style("text-align", "center")
                    .html(i18next.t("app_page.layer_style_popup.color_break"));
        var p2 = fill_color_section.append("p").style("display", "inline");
        var col1 = p2.insert("input").attr("type", "color")
                            .attr("id", "col1")
                            .attr("value", current_layers[layer_name].fill_color.two[0])
                            .on("change", function(){
                                let new_break_val = +b_val.node().value;
                                current_layers[layer_name].fill_color.two[0] = this.value;
                                selection.transition().style("fill", (d,i) => (d_values[i] > new_break_val) ? col2.node().value : this.value);
                            });
        var col2 = p2.insert("input").attr("type", "color")
                            .attr("id", "col2")
                            .attr("value", current_layers[layer_name].fill_color.two[1])
                            .on("change", function(){
                                let new_break_val = +b_val.node().value;
                                current_layers[layer_name].fill_color.two[1] = this.value;
                                selection.transition().style("fill", (d,i) => (d_values[i] > new_break_val) ? this.value : col1.node().value);

                            });
        fill_color_section.insert("span").html(i18next.t("app_page.layer_style_popup.break_value"));
        var b_val = fill_color_section.insert("input")
                            .attrs({type: "number", value: current_layers[layer_name].break_val})
                            .style("width", "75px")
                            .on("change", function(){
                                let new_break_val = +this.value;
                                current_layers[layer_name].break_val = new_break_val;
                                selection.transition().style("fill", (d,i) => (d_values[i] > new_break_val) ? col2.node().value : col1.node().value);
                            });
    } else if (type_method === "PropSymbolsTypo") {
      let field_color = current_layers[layer_name].rendered_field2;
      popup.append('p')
          .style("margin", "auto")
          .html(i18next.t("app_page.layer_style_popup.field_symbol_color", {field: field_color}));
      popup.append('p').style('text-align', 'center')
          .insert('button')
          .attr("class", "button_disc").html(i18next.t("app_page.layer_style_popup.choose_colors"))
          .on("click", function(){
            let [cats, _] = prepare_categories_array(layer_name, field_color, current_layers[layer_name].color_map);
            display_categorical_box(result_data[layer_name], layer_name, field_color, cats)
                .then(function(confirmed){
                    if(confirmed){
                        rendering_params = {
                                nb_class: confirmed[0], color_map :confirmed[1], colorsByFeature: confirmed[2],
                                renderer:"Categorical", rendered_field: field_color
                            }
                        selection.style("fill", (d,i) => rendering_params.colorsByFeature[i]);
                        lgd_to_change = true;
                    }
                });
      });

    } else {
        let fields_all = type_col2(result_data[layer_name]),
            fields = getFieldsType('category', null, fields_all),
            fill_method = popup.append("p").html(i18next.t("app_page.layer_style_popup.fill_color")).insert("select");

        [[i18next.t("app_page.layer_style_popup.single_color"), "single"],
         [i18next.t("app_page.layer_style_popup.random_color"), "random"]]
            .forEach(function(d,i){
                fill_method.append("option").text(d[0]).attr("value", d[1])
            });
        popup.append('div').attr("id", "fill_color_section")
        fill_method.on("change", function(){
            popup.select("#fill_color_section").html("").on("click", null);
            if (this.value == "single"){
                make_single_color_menu(layer_name, fill_prev, type_symbol);
                svg_layers.select(g_lyr_name)
                    .selectAll(type_symbol)
                    .transition()
                    .style("fill", fill_prev.single);
                current_layers[layer_name].fill_color = cloneObj(fill_prev);
            } else if (this.value == "random"){
                make_random_color(layer_name, type_symbol);
            }
        });
        setSelected(fill_method.node(), Object.getOwnPropertyNames(fill_prev)[0])
    }

    let fill_opct_section = popup.append('p').attr("class", "line_elem")
    fill_opct_section.append("span").html(i18next.t("app_page.layer_style_popup.fill_opacity"));

    fill_opct_section.insert('input')
        .attrs({type: "range", min: 0, max: 1, step: 0.1, value: opacity})
        .styles({width: "58px", "vertical-align": "middle", "display": "inline", "float": "right"})
        .on('change', function(){
            selection.style('fill-opacity', this.value);
            fill_opct_section.select("#fill_opacity_txt").html((+this.value * 100) + "%");
        });

    fill_opct_section.append("span")
        .attr("id", "fill_opacity_txt")
        .style("float", "right")
        .html((+opacity * 100) + "%");

    let border_color_section = popup.append('p').attr("class", "line_elem");
    border_color_section.append("span").html(i18next.t("app_page.layer_style_popup.border_color"));
    border_color_section.insert('input')
        .attrs({type: "color", "value": stroke_prev})
        .style("float", "right")
        .on('change', function(){
            selection.transition().style("stroke", this.value);
        });

    let border_opacity_section = popup.append('p')
    border_opacity_section.append("span").html(i18next.t("app_page.layer_style_popup.border_opacity"));

    border_opacity_section.insert('input')
        .attrs({type: "range", min: 0, max: 1, step: 0.1, value: border_opacity})
        .styles({width: "58px", "vertical-align": "middle", "display": "inline", float: "right"})
        .on('change', function(){
            selection.style('stroke-opacity', this.value);
            border_opacity_section.select("#border_opacity_txt").html((+this.value * 100) + "%");
        });

    border_opacity_section.append("span")
        .attr("id", "border_opacity_txt")
        .style("float", "right")
        .html((+border_opacity * 100) + "%");

    let border_width_section = popup.append('p').attr("class", "line_elem");
    border_width_section.append("span").html(i18next.t("app_page.layer_style_popup.border_width"));
    border_width_section.insert('input')
        .attrs({type: "number", min: 0, step: 0.1, value: stroke_width})
        .styles({width: "60px", float: "right"})
        .on('change', function(){
            selection.style("stroke-width", this.value+"px");
            current_layers[layer_name]['stroke-width-const'] = +this.value
        });

    let prop_val_content = popup.append("p");
    prop_val_content.append("span").html(i18next.t("app_page.layer_style_popup.field_symbol_size", {field: field_used}));
    prop_val_content.append('span').html(i18next.t("app_page.layer_style_popup.symbol_fixed_size"));
    prop_val_content.insert('input')
        .styles({width: "60px", float: "right"})
        .attrs({type: "number", id: "max_size_range", min: 0.1, step: "any", value: current_layers[layer_name].size[1]})
        .on("change", function(){
            let f_size = +this.value,
                prop_values = prop_sizer3_e(d_values, current_layers[layer_name].size[0], f_size, type_symbol);
            current_layers[layer_name].size[1] = f_size;
            redraw_prop_val(prop_values);
        });
    prop_val_content.append("span")
        .style("float", "right")
        .html('(px)');

    let prop_val_content2 = popup.append("p").attr("class", "line_elem");
    prop_val_content2.append("span").html(i18next.t("app_page.layer_style_popup.on_value"));
    prop_val_content2.insert("input")
        .styles({width: "100px", float: "right"})
        .attrs({type: "number", min: 0.1, step: 0.1, value: +current_layers[layer_name].size[0]})
        .on("change", function(){
            let f_val = +this.value,
                prop_values = prop_sizer3_e(d_values, f_val, current_layers[layer_name].size[1], type_symbol);
            redraw_prop_val(prop_values);
            current_layers[layer_name].size[0] = f_val;
        });

    let _fields = get_fields_name(layer_name);
    if(_fields && _fields.length > 0){
      let labels_section = popup.append("p");
      let input_fields = {};
      for(let i = 0; i < _fields.length; i++){
        input_fields[_fields[i]] = _fields[i];
      }
      labels_section.append("span")
          .attr("id", "generate_labels")
          .styles({"cursor": "pointer", "margin-top": "15px"})
          .html(i18next.t("app_page.layer_style_popup.generate_labels"))
          .on("mouseover", function(){
            this.style.fontWeight = "bold"
          })
          .on("mouseout", function(){
            this.style.fontWeight = "";
          })
          .on("click", function(){
            let fields =
            swal({
                title: "",
                text: i18next.t("app_page.layer_style_popup.field_label"),
                type: "question",
                customClass: 'swal2_custom',
                showCancelButton: true,
                showCloseButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: i18next.t("app_page.common.confirm"),
                input: 'select',
                inputPlaceholder: i18next.t("app_page.common.field"),
                inputOptions: input_fields,
                inputValidator: function(value) {
                    return new Promise(function(resolve, reject){
                        if(_fields.indexOf(value) < 0){
                            reject(i18next.t("app_page.common.no_value"));
                        } else {
                          let options_labels = {
                            label_field: value,
                            color: "#000",
                            font: "Arial,Helvetica,sans-serif",
                            ref_font_size: 12,
                            uo_layer_name: ["Labels", value, layer_name].join('_'),
                            symbol: type_symbol
                          };
                          render_label(layer_name, options_labels);
                          resolve();
                        }
                    });
                }
              }).then( value => {
                    console.log(value);
                }, dismiss => {
                    console.log(dismiss);
                });
          });
    }

}

function make_style_box_indiv_label(label_node){
    let current_options = {size: label_node.style.fontSize,
                           content: label_node.textContent,
                           font: label_node.style.fontFamily,
                           color: label_node.style.fill};

    if(current_options.color.startsWith("rgb"))
        current_options.color = rgb2hex(current_options.color);

    let new_params = {};

    let existing_box = document.querySelector(".styleTextAnnotation");
    if(existing_box) existing_box.remove();

    make_confirm_dialog2("styleTextAnnotation", i18next.t("app_page.func_options.label.title_box_indiv"))
        .then( confirmed => {
            if(!confirmed){
                label_node.style.fontsize = current_options.size;
                label_node.textContent = current_options.content;
                label_node.style.fill = current_options.color;
                label_node.style.fontFamily = current_options.font;
                label_node.__data__.properties.size = +current_options.size.replace('px', '');
            }
        });
    let box_content = d3.select(".styleTextAnnotation").select(".modal-body").insert("div");
    box_content.append("p").html(i18next.t("app_page.func_options.label.font_size"))
        .append("input")
        .attrs({type: "number", id: "font_size", min: 0, max: 34, step: "any", value: +label_node.style.fontSize.slice(0,-2)})
        .style("width", "70px")
        .on("change", function(){
            label_node.style.fontSize = this.value + "px";
            label_node.__data__.properties.size = this.value;
        });
    box_content.append("p").html(i18next.t("app_page.func_options.label.content"))
        .append("input").attrs({"value": label_node.textContent, id: "label_content"})
        .on("keyup", function(){
            label_node.textContent = this.value;
        });
    box_content.append("p").html(i18next.t("app_page.func_options.common.color"))
        .append("input").attrs({"type": "color", "value": rgb2hex(label_node.style.fill), id: "label_color"})
        .on("change", function(){
            label_node.style.fill = this.value;
        });
    box_content.append("p").html(i18next.t("app_page.func_options.label.font_type"))
    let selec_fonts = box_content.append("select")
        .on("change", function(){
            label_node.style.fontFamily = this.value;
        });

    available_fonts.forEach( name => {
        selec_fonts.append("option").attr("value", name[1]).text(name[0]);
    });
    selec_fonts.node().value = label_node.style.fontFamily;
};

/**
* Return the id of a gaussian blur filter with the desired size (stdDeviation attribute)
* if one with the same param already exists, its id is returned,
* otherwise a new one is created, and its id is returned
*/
var getBlurFilter = (function(size){
    var count = 0;
    return function(size) {
        let blur_filts = defs.node().getElementsByClassName("blur");
        let blur_filt_to_use;
        for(let i=0; i < blur_filts.length; i++){
            if(blur_filts[i].querySelector("feGaussianBlur").getAttributeNS(null, "stdDeviation") == size){
                blur_filt_to_use = blur_filts[i];
            }
        }
        if(!blur_filt_to_use){
            count = count + 1;
            blur_filt_to_use = document.createElementNS("http://www.w3.org/2000/svg", "filter");
            blur_filt_to_use.setAttribute("id","blurfilt" + count);
            blur_filt_to_use.setAttribute("class", "blur");
            var gaussianFilter = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
            gaussianFilter.setAttributeNS(null, "in", "SourceGraphic");
            gaussianFilter.setAttributeNS(null, "stdDeviation", size);
            blur_filt_to_use.appendChild(gaussianFilter);
            defs.node().appendChild(blur_filt_to_use);
        }
        return blur_filt_to_use.id;
    };
})();
