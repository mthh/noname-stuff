"use strict";
/*
* Memoization functions (naive LRU implementation)
*
*/
Function.prototype.memoized = function(max_size=25) {
  this._memo = this._memo || {values: new Map(), stack: [], max_size: max_size};
  var key = JSON.stringify(Array.prototype.slice.call(arguments));
  var cache_value = this._memo.values.get(key);
  if (cache_value !== undefined) {
    return JSON.parse(cache_value);
  } else {
    cache_value = this.apply(this, arguments);
    this._memo.values.set(key, JSON.stringify(cache_value));
    this._memo.stack.push(key)
    if(this._memo.stack.length >= this._memo.max_size){
        let old_key = this._memo.stack.shift();
        this._memo.values.delete(old_key);
    }
    return cache_value;
  }
};
Function.prototype.memoize = function() {
  var fn = this;
  return function() {
    return fn.memoized.apply(fn, arguments);
  };
};

/**
* Function setting-up main elements of the interface
*
* Some of the variables created here are put in global/window scope
* as they are gonna be frequently used
*
*/
function setUpInterface(resume_project)
{
    // Only ask for confirmation before leaving page if things have been done
    // (layer added, etc..)
    window.addEventListener("beforeunload", beforeUnloadWindow);

    // Remove some layers from the server when user leave the page
    // (ie. result layers are removed but targeted layer and layout layers stay
    // in cache as they have more chance to be added again)
    window.addEventListener("unload", function(){
        let layer_names = Object.getOwnPropertyNames(current_layers).filter(name => {
            if(sample_no_values.has(name) || !(current_layers[name].hasOwnProperty("key_name")))
                return 0;
            else if(current_layers[name].targeted)
                return 0;
            else if(current_layers[name].renderer
                    && (current_layers[name].renderer.indexOf("PropSymbols") > -1
                        || current_layers[name].renderer.indexOf("Dorling") > -1
                        || current_layers[name].renderer.indexOf("Choropleth") > -1
                        || current_layers[name].renderer.indexOf("Categorical") > -1))
                return 0;
            return 1;
        });
        if(layer_names.length){
            let formToSend = new FormData();
            layer_names.forEach(function(name){
                formToSend.append("layer_name", current_layers[name].key_name);
            });
            navigator.sendBeacon("/layers/delete", formToSend);
        }
    }, false);
    let bg = document.createElement('div');
    bg.id = 'overlay';
    bg.style.display = "none";
    bg.style.textAlign = "center";
    bg.innerHTML = '<span class="i18n" style="color: white; z-index: 2;margin-top:185px;display: inline-block;" data-i18n="[html]app_page.common.loading_results"></span>' +
                   '<span style="color: white; z-index: 2;">...<br></span>' +
                   '<span class="i18n" style="color: white; z-index: 2;display: inline-block;" data-i18n="[html]app_page.common.long_computation"></span><br>' +
                   '<div class="load-wrapp" style="left: calc(50% - 60px);position: absolute;top: 50px;"><div class="load-1"><div class="line"></div>' +
                   '<div class="line"></div><div class="line"></div></div></div>';
    let btn = document.createElement("button");
    btn.style.fontSize = '13px';
    btn.style.background = '#4b9cdb';
    btn.style.border = '1px solid #298cda';
    btn.style.fontWeight = 'bold';
    btn.className = "button_st3 i18n"
    btn.setAttribute("data-i18n", "[html]app_page.common.cancel");
    bg.appendChild(btn)
    document.body.appendChild(bg);

    btn.onclick = function(){
        if(_app.xhr_to_cancel){
          _app.xhr_to_cancel.abort();
          _app.xhr_to_cancel = undefined;
        }
        if(_app.webworker_to_cancel){
          _app.webworker_to_cancel.onmessage = null;
          _app.webworker_to_cancel.terminate();
          _app.webworker_to_cancel = undefined;
        }
        document.getElementById('overlay').style.display = 'none';
    };


    let bg_drop = document.createElement('div');
    bg_drop.className = "overlay_drop";
    bg_drop.id = 'overlay_drop';
    bg_drop.style = "background: black; opacity:0.6;display: none;padding: 10px;";
    let inner_div = document.createElement("div");
    inner_div.style.border = "dashed 2px white";
    inner_div.style.margin = "10px";
    inner_div.style.background = "rgba(0, 0, 0, 0.33)";
    inner_div.style.borderRadius = "1%";
    inner_div.className = "overlay_drop";
    let inner_p = document.createElement("p");
    inner_p.style = "position: fixed;top: 50%;left: 50%;transform: translateX(-50%)translateY(-50%);font-size: 14px;width: auto;bottom: 0px;opacity: 0.85;text-align: center;color: white;padding: 0.5em;"
    inner_p.innerHTML = "Drop your file(s) in the window ...";
    inner_div.appendChild(inner_p);
    bg_drop.appendChild(inner_div);
    document.body.appendChild(bg_drop);

    let menu = d3.select("#menu"),

        b_accordion1 = menu.append("button").attr("id", "btn_s1").attr("class", "accordion i18n").attr("data-i18n", "app_page.section1.title"),
        accordion1 = menu.append("div").attr("class", "panel").attr("id", "accordion1"),
        b_accordion2_pre = menu.append("button").attr("id", "btn_s2").attr("class", "accordion i18n").attr("data-i18n", "app_page.section2.title"),
        accordion2_pre = menu.append("div").attr("class", "panel").attr("id", "accordion2_pre"),
        b_accordion2 = menu.append("button").attr("id", "btn_s2b").attr("class", "accordion i18n").style('display', 'none'),
        accordion2 = menu.append("div").attr("class", "panel").attr("id", "accordion2b").style('display', 'none'),
        b_accordion3 = menu.append("button").attr("id", "btn_s3").attr("class", "accordion i18n").attr("data-i18n", "app_page.section3.title"),
        accordion3 = menu.append("div").attr("class", "panel").attr("id", "accordion3"),
        b_accordion4 = menu.append("button").attr("id", "btn_s4").attr("class", "accordion i18n").attr("data-i18n", "app_page.section4.title"),
        accordion4 = menu.append("div").attr("class", "panel").attr("id", "accordion4"),
        b_accordion5 = menu.append("button").attr("id", "btn_s5").attr("class", "accordion i18n").attr("data-i18n", "app_page.section5b.title"),
        accordion5 = menu.append("div").attr("class", "panel").attr("id", "accordion5b");

    window.section1 =  accordion1.append("div")
                        .attr("id","section1")
                        .attr("class", "i18n")
                        .attr("data-i18n", "[tooltip-title]app_page.tooltips.section1")
                        .attr("data-tooltip-position", "right");
    window.section2_pre =  accordion2_pre.append("div").attr("id","section2_pre");
    window.section2 = accordion2.append('div').attr('id', 'section2');
    accordion3.append("div")
        .attrs({id: "section3", class: "i18n",
                "data-i18n": "[tooltip-title]app_page.tooltips.section3",
                "data-tooltip-position": "right"}),
    accordion4.append("div").attr("id","section4");
    accordion5.append("div").attr("id","section5");

    let dv1 = section1.append("div"),
        dv11 = dv1.append("div").style("width", "auto");

    dv11.append("img")
        .attrs({"id": "img_in_geom", "class": "user_panel", "src": "/static/img/b/addgeom.png", "width": "26", "height": "26",  "alt": "Geometry layer"})
        .style("cursor", "pointer")
        .on('click',  click_button_add_layer);

    dv11.append("p")
        .attrs({id: "input_geom", class: "user_panel i18n"})
        .styles({display: "inline", cursor: "pointer", "margin-left": "5px", "vertical-align": "super", "font-weight": "bold"})
        .attr("data-i18n", "[html]app_page.section1.add_geom")
        .on('click',  click_button_add_layer);

    let dv12 = dv1.append("div");
    dv12.append("img")
        .attrs({"id": "img_data_ext", "class": "user_panel", "src": "/static/img/b/addtabular.png", "width": "26", "height": "26",  "alt": "Additional dataset"})
        .style("cursor", "pointer")
        .on('click',  click_button_add_layer);

    dv12.append("p")
        .attrs({"id": "data_ext", "class": "user_panel i18n", "data-i18n": "[html]app_page.section1.add_ext_dataset"})
        .styles({display: "inline", cursor: "pointer", "margin-left": "5px", "vertical-align": "super", "font-weight": "bold"})
        .on('click',  click_button_add_layer);

    let div_sample = dv1.append("div").attr("id", "sample_zone");
    div_sample.append("img")
        .attrs({"id": "sample_button", "class": "user_panel", "src": "/static/img/b/addsample.png", "width": "26", "height": "26",  "alt": "Sample layers"})
        .style("cursor", "pointer")
        .on('click', add_sample_layer);

    div_sample.append("span")
        .attrs({"id": "sample_link", "class": "user_panel i18n"})
        .styles({display: "inline", cursor: "pointer", "margin-left": "5px", "vertical-align": "super", "font-weight": "bold"})
        .attr("data-i18n", "[html]app_page.section1.add_sample_data")
        .on('click', add_sample_layer);

    dv1.append("p")
        .attr("id", "join_section")
        .styles({"text-align": "center", "margin-top": "2px"})
        .html("");

    dv1.append('p')
        .styles({'text-align': 'center','margin': '5px'})
        .insert('button')
        .attrs({'id': 'btn_type_fields', 'class': 'i18n',
                'data-i18n': '[html]app_page.box_type_fields.title',
                'disabled': true})
        .styles({cursor: 'pointer', disabled: 'true'})
        .html(i18next.t('app_page.box_type_fields.title'))
        .on('click', function(){
            let layer_name = Object.getOwnPropertyNames(user_data)[0];
            make_box_type_fields(layer_name);
          });

    make_ico_choice();

    let section3 = d3.select("#section3");

    window.layer_list = section3.append("div")
                             .append("ul").attrs({id: "sortable", class: "layer_list"});

    let dv3 = section3.append("div")
                    .style("padding-top", "10px").html('');

    dv3.append("img")
        .attr("src", "/static/img/b/addsample_t.png")
        .styles({cursor: "pointer", margin: "2.5px", float: "right", "border-radius": "10%"})
        .on('click', add_layout_layers);
    dv3.append("img")
        .attrs({"src": "/static/img/b/addgeom_t.png", 'id': 'input_layout_geom'})
        .styles({cursor: "pointer", margin: "2.5px", float: "right", "border-radius": "10%"})
        .on("click", click_button_add_layer);

    let section4 = d3.select("#section4");
    let dv4 = section4.append("div").attr("class", "form-item").style("margin", "auto")
                    .append("ul")
                    .styles({"list-style": "outside none none",
                             display: "inline-block",
                             padding: "0px",
                             width: "100%",
                             "margin-top": "0px"});

    let e = dv4.append("li").styles({margin: "1px", padding: "4px", "text-align": "center"});
    e.append("input")
            .attrs({"id": "title", "class": "list_elem_section4 i18n",
                    "placeholder": "", "data-i18n": "[placeholder]app_page.section4.map_title"})
            .styles({"margin": "0px 0px 0px 3px", "width": "160px"})
            .on("keyup", function(){
                handle_title(this.value);
            });
    e.append("span")
            .styles({display: "inline", top: "4px", cursor: "pointer", "vertical-align": "sub"})
            .html(sys_run_button.replace("submit", "Title properties"))
            .on("click", handle_title_properties);

    let f = dv4.append("li").styles({margin: "1px", padding: "4px"});
    f.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.background_color");
    f.append("input")
            .styles({position: "absolute", right: "20px", "width": "60px", "margin-left": "15px"})
            .attrs({type: "color", id: "bg_color", value: "#ffffff", "class": "list_elem_section4 m_elem_right"})
            .on("change", function(){
                handle_bg_color(this.value);
            });

    let a1 = dv4.append("li").styles({margin: "1px", padding: "4px"});
    a1.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_width");
    a1.append("input")
            .attrs({id: "input-width", type: "number", value: w, "class": "list_elem_section4 m_elem_right"})
            .on("change", function(){
                let new_width = +this.value;
                if(new_width == 0 || isNaN(new_width)){
                    this.value = w;
                    return;
                }
                let ratio_type = document.getElementById("map_ratio_select").value;
                if(ratio_type == "portrait"){
                    h = round_value(new_width / 0.70707, 0);
                    canvas_mod_size([new_width, h]);
                } else if (ratio_type == "landscape"){
                    h = round_value(new_width * 0.70707, 0);
                    canvas_mod_size([new_width, h]);
                } else {
                    canvas_mod_size([new_width, null]);
                }
                document.getElementById("input-height").value = h;
            });


    let a2 = dv4.append("li").styles({margin: "1px", padding: "4px"});
    a2.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_height");
    a2.append("input")
            .attrs({id: "input-height", type: "number", "value": h, class: "m_elem_right list_elem_section4"})
            .on("change", function(){
                let new_height = +this.value;
                if(new_height == 0 || isNaN(new_height)){
                    this.value = h;
                    return;
                }
                let ratio_type = document.getElementById("map_ratio_select").value;
                if(ratio_type == "portrait"){
                    w = round_value(new_height * 0.70707, 0);
                    canvas_mod_size([w, new_height]);
                } else if (ratio_type == "landscape"){
                    w = round_value(new_height / 0.70707, 0);
                    canvas_mod_size([w, new_height]);
                } else {
                    canvas_mod_size([null, new_height]);
                }
                document.getElementById("input-width").value = w;
            });

    let b = dv4.append("li").styles({margin: "1px", padding: "4px 0"});
    b.append("p").attr("class", "list_elem_section4 i18n")
            .style("padding", "4px")
            .attr("data-i18n", "[html]app_page.section4.map_ratio");
    let ratio_select = b.append("select")
            .attrs({"class": "list_elem_section4 i18n m_elem_right", "id": "map_ratio_select"});

    ratio_select.append("option").text("").attr("data-i18n", "[html]app_page.section4.ratio_user").attr("value", "ratio_user");
    ratio_select.append("option").text("").attr("data-i18n", "[html]app_page.section4.ratio_landscape").attr("value", "landscape");;
    ratio_select.append("option").text("").attr("data-i18n", "[html]app_page.section4.ratio_portait").attr("value", "portrait");
    ratio_select.on("change", function(){
        let map_xy = get_map_xy0();
        let dispo_w = document.innerWidth - map_xy.x - 1;
        let dispo_h = document.innerHeight - map_xy.y - 1;
        let diff_w = dispo_w - w;
        let diff_h = dispo_h - h;
        if(this.value == "portrait"){
            if(round_value(w / h, 1) == 1.4){
              let t = h;
              h = w;
              w = t;
            } else if(diff_h >= diff_w){
                w = round_value(h * 0.70707, 0);
            } else {
                h = round_value(w / 0.70707, 0);
            }
        } else if (this.value == "landscape"){
            if(round_value(h / w, 1) == 1.4){
              let t = h;
              h = w;
              w = t;
            } else if(diff_h <= diff_w){
                w = round_value(h / 0.70707, 0);
            } else {
                h = round_value(w * 0.70707, 0);
            }
        }
        canvas_mod_size([w, h]);
        document.getElementById("input-width").value = w;
        document.getElementById("input-height").value = h;
        fill_export_png_options(this.value);
    });
    let zoom_prop = svg_map.__zoom;

    let c = dv4.append("li").styles({margin: "1px", padding: "4px"});
    c.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_center_menu")
            .style("cursor", "pointer");
    c.append("span").attr("id", "map_center_menu_ico")
        .style("display", "inline-table")
        .style("cursor", "pointer");
    c.on("click", function(){
        let sections = document.getElementsByClassName("to_hide"),
            arg;
        if(sections[0].style.display == "none"){
            arg = "";
            document.getElementById("map_center_menu_ico").classList = "active";
        } else {
            arg = "none";
            document.getElementById("map_center_menu_ico").classList = "";
        }
        sections[0].style.display = arg;
        sections[1].style.display = arg;
        sections[2].style.display = arg;
    });

    let c1 = dv4.append("li").style("display", "none").attr("class", "to_hide");
    c1.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_center_x");
    c1.append("input")
            .style("width", "80px")
            .attrs({id: "input-center-x", class: "m_elem_right",
                    type: "number", value: round_value(zoom_prop.x, 2), step: "any"})
            .on("change", function(){
                svg_map.__zoom.x = +this.value;
                zoom_without_redraw();
            });

    let c2 = dv4.append("li").style("display", "none").attr("class", "to_hide");
    c2.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_center_y");

    c2.append("input")
            .attrs({id: "input-center-y", class: "list_elem_section4 m_elem_right",
                    type: "number", "value": round_value(zoom_prop.y, 2), step: "any"})
            .style("width", "80px")
            .on("change", function(){
                            svg_map.__zoom.y = +this.value;
                            zoom_without_redraw();
                        });;

    let d = dv4.append("li").style("display", "none").attr("class", "to_hide");
    d.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.map_scale_k");
    d.append("input")
            .attrs({id: "input-scale-k",
                    class: "list_elem_section4 m_elem_right",
                    type: "number",
                    value: round_value(zoom_prop.k * proj.scale(), 2),
                    step: "any"})
            .style("width", "80px")
            .on("change", function(){
                svg_map.__zoom.k = +this.value / proj.scale();
                zoom_without_redraw();
            });

    let d2 = dv4.append("li").styles({margin: "1px", padding: "4px"});
    d2.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.resize_fit");
    d2.append("button")
            .styles({margin: 0, padding: 0})
            .attrs({id: "resize_fit", type: "number", "value": h,
                    class: "m_elem_right list_elem_section4 button_st4 i18n",
                    'data-i18n': '[html]app_page.common.ok'})
            .on('click', function(){
                document.getElementById('btn_s4').click();
                window.scrollTo(0, 0);
                w = Math.round(window.innerWidth - 361);
                h = window.innerHeight - 55;
                canvas_mod_size([w, h]);
                document.getElementById('map_ratio_select').value = "ratio_user";
            });

    let g = dv4.append("li").styles({margin: "1px", padding: "4px"});
    g.append("p").attr("class", "list_elem_section4 i18n")
            .attr("data-i18n", "[html]app_page.section4.canvas_rotation");

    g.append("span")
        .style("float", "right")
        .html("°");

    g.append("input")
        .attrs({id: "canvas_rotation_value_txt", class: "without_spinner",
                value: 0, min: 0, max: 360, step: "any"})
        .styles({width: "30px", "margin-left": "10px", "float": "right", "font-size": "11.5px"})
        .on("change", function(){
            let val = +this.value,
                old_value = document.getElementById("form_rotate").value;
            if(isNaN(val) || val < -361){
                this.value = old_value;
                return;
            } else if(val < 0 && val > -361) {
                this.value = 360 + val;
            } else if(val > 360) {
                this.value = 360;
            } else { // Should remove trailing zeros (right/left) if any :
              this.value = +this.value;
            }
            rotate_global(this.value);
            document.getElementById("form_rotate").value = this.value;
        });

      g.append("input")
              .attrs({type: "range", id: "form_rotate", value: 0,
                      min: 0, max: 360, step: 1})
              .styles({width: "80px", margin: "0px 10px 9px 15px",
                       float: "right", "vertical-align": "middle"})
              .on("input", function(){
                  rotate_global(this.value);
                  document.getElementById("canvas_rotation_value_txt").value = this.value;
              });

    let _i = dv4.append('li').styles({margin: '1px', padding: '4px', display: 'inline-flex', 'margin-left': '20px'});
    _i.insert('span').insert('img').attrs({id: 'btn_arrow', src: '/static/img/layout_icons/arrow-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.arrow'}).on('click', () => add_layout_feature('arrow'));
    // _i.insert('span').insert('img').attrs({id: 'btn_free_draw', src: '/static/img/layout_icons/draw-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.free_draw'}).on('click', () => add_layout_feature('free_draw'));
    _i.insert('span').insert('img').attrs({id: 'btn_ellipse', src: '/static/img/layout_icons/ellipse-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.ellipse'}).on('click', () => add_layout_feature('ellipse'));
    _i.insert('span').insert('img').attrs({id: 'btn_graticule', src: '/static/img/layout_icons/graticule-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.graticule'}).on('click', () => add_layout_feature('graticule'));
    _i.insert('span').insert('img').attrs({id: 'btn_north', src: '/static/img/layout_icons/north-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.north_arrow'}).on('click', () => add_layout_feature('north_arrow'));
    _i.insert('span').insert('img').attrs({id: 'btn_scale', src: '/static/img/layout_icons/scale.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.scale'}).on('click', () => add_layout_feature('scale'));
    _i.insert('span').insert('img').attrs({id: 'btn_sphere', src: '/static/img/layout_icons/sphere-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.sphere'}).on('click', () => add_layout_feature('sphere'));
    _i.insert('span').insert('img').attrs({id: 'btn_symbol', src: '/static/img/layout_icons/symbols-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.symbol'}).on('click', () => add_layout_feature('symbol'));
    _i.insert('span').insert('img').attrs({id: 'btn_text_annot', src: '/static/img/layout_icons/text-01.png', class:'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.text_annot'}).on('click', () => add_layout_feature('text_annot'));

    add_simplified_land_layer();

    let section5b = d3.select("#section5");
    let dv5b = section5b.append("div")
                .attr("class", "form-item");

    let type_export = dv5b.append("p");
    type_export.append("span").attr("class", "i18n")
            .attr("data-i18n", "[html]app_page.section5b.type");
    let select_type_export = type_export.append("select")
            .attrs({"id": "select_export_type", "class": "m_elem_right"})
            .on("change", function(){
                let type = this.value,
                    export_filename = document.getElementById("export_filename");
                if(type === "svg"){
                    document.getElementById('export_options_geo').style.display = 'none';
                    document.getElementById("export_options_png").style.display = "none";
                    export_filename.value = "export.svg";
                    export_filename.style.display = "";
                    export_filename.previousSibling.style.display = "";
                } else if (type === "png"){
                    document.getElementById('export_options_geo').style.display = 'none';
                    document.getElementById("export_options_png").style.display = "";
                    export_filename.value = "export.png";
                    export_filename.style.display = "";
                    export_filename.previousSibling.style.display = "";
                } else if (type === "geo"){
                    document.getElementById("export_options_png").style.display = "none";
                    document.getElementById('export_options_geo').style.display = '';
                    export_filename.style.display = "none";
                    export_filename.previousSibling.style.display = "none";
                }
            });

    select_type_export.append("option").text("SVG").attr("value", "svg");
    select_type_export.append("option").text("PNG").attr("value", "png");
    select_type_export.append("option").text("GEO").attr("value", "geo");

    let export_png_options = dv5b.append("p")
                                .attr("id", "export_options_png")
                                .style("display", "none");
    export_png_options.append("span")
            .attrs({"class": "i18n", "data-i18n": "[html]app_page.section5b.format"});

    let select_size_png = export_png_options.append("select")
                                .attrs({"id": "select_png_format", "class": "m_elem_right"});
    fill_export_png_options("user_defined");

    select_size_png.on("change", function(){
        let value = this.value,
            unit = value === "web" ? " (px)" : " (cm)",
            in_h = document.getElementById("export_png_height"),
            in_w = document.getElementById("export_png_width");
        if(value === "web"){
            in_h.value = h;
            in_w.value = w;
        } else if (value === "user_defined"){
            in_h.value = Math.round(h / 118.11 * 10) / 10;
            in_w.value = Math.round(w / 118.11 * 10) / 10
        } else if (value === "A4_landscape"){
            in_h.value = 21.0;
            in_w.value = 29.7;
        } else if (value === "A4_portrait"){
            in_h.value = 29.7;
            in_w.value = 21.0;
        } else if (value === "A3_landscape"){
            in_h.value = 42.0;
            in_w.value = 29.7;
        } else if (value === "A3_portrait"){
            in_h.value = 29.7;
            in_w.value = 42.0;
        } else if (value === "A5_landscape"){
            in_h.value = 14.8;
            in_w.value = 21.0;
        } else if (value === "A5_portrait"){
            in_h.value = 21.0;
            in_w.value = 14.8;
        }
        document.getElementById("export_png_width_txt").innerHTML = unit;
        document.getElementById("export_png_height_txt").innerHTML = unit;
        if(value.indexOf("portrait") > -1 || value.indexOf("landscape") > -1){
            in_h.disabled = "disabled";
            in_w.disabled = "disabled";
        } else {
            in_h.disabled = undefined;
            in_w.disabled = undefined;
        }
    });

    let exp_a = export_png_options.append("p");
    exp_a.append("span")
            .attrs({"class": "i18n", "data-i18n": "[html]app_page.section5b.width"});

    exp_a.append("input")
            .style("width", "60px")
            .attrs({"id": "export_png_width", "class": "m_elem_right", "type": "number", step: 0.1, value: w})
            .on("change", function(){
                let ratio = h / w,
                    export_png_height = document.getElementById("export_png_height");
                export_png_height.value = Math.round(+this.value * ratio * 10) / 10;
            });

    exp_a.append("span")
            .attr("id", "export_png_width_txt")
            .html(" (px)");

    let exp_b = export_png_options.append("p");
    exp_b.append("span")
            .attrs({"class": "i18n", "data-i18n": "[html]app_page.section5b.height"});

    exp_b.append("input")
            .style("width", "60px")
            .attrs({"id": "export_png_height", "class": "m_elem_right", "type": "number", step: 0.1, value: h})
            .on("change", function(){
                let ratio = h / w,
                    export_png_width = document.getElementById("export_png_width");
                export_png_width.value = Math.round(+this.value / ratio * 10) / 10;
            });

    exp_b.append("span")
            .attr("id", "export_png_height_txt")
            .html(" (px)");

    let export_name = dv5b.append("p");
    export_name.append("span")
            .attrs({class: "i18n", "data-i18n": "[html]app_page.section5b.filename"});

    export_name.append("input")
            .attrs({"id": "export_filename", "class": "m_elem_right", "type": "text"});

    let export_geo_options = dv5b.append("p")
        .attr("id", "export_options_geo")
        .style("display", "none");

    let geo_a = export_geo_options.append('p')
        .style('margin-bottom', '0');
    geo_a.append('span')
        .attrs({'class': 'i18n', 'data-i18n': '[html]app_page.export_box.option_layer'});

    let selec_layer = export_geo_options.insert("select")
        .styles({'position': 'sticky', 'float': 'right'})
        .attrs({id: "layer_to_export", class: 'i18n m_elem_right'});

    let geo_b = export_geo_options.append('p')
        .styles({'clear': 'both'}); // 'margin-top': '35px !important'
    geo_b.append('span')
        .attrs({'class': 'i18n', 'data-i18n': '[html]app_page.export_box.option_datatype'});
    let selec_type = geo_b.insert("select")
        .attrs({id: 'datatype_to_use', class: 'i18n m_elem_right'});

    export_geo_options.append('p')
        .style('margin', 'auto')
        .attrs({'class': 'i18n', 'data-i18n': '[html]app_page.export_box.option_projection'});
    let geo_c = export_geo_options.append('p').style('margin', 'auto');
    let selec_projection = geo_c.insert("select")
        .styles({position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px'})
        .attrs({id: "projection_to_use", disabled: true, class: 'i18n'});

    let proj4_input = export_geo_options.append('p').style('margin', 'auto')
        .insert("input")
        .attrs({id: 'proj4str'})
        .styles({display: 'none', width: '275px', position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px'})
        .on('keyup', function(){
            ok_button.disabled = this.value.length == 0 ? 'true' : '';
        });

    ["GeoJSON", "TopoJSON", "ESRI Shapefile", "GML", "KML"].forEach( name => {
    // ["GeoJSON", "TopoJSON", "ESRI Shapefile", "GML"].forEach( name => {
        selec_type.append("option").attr("value", name).text(name);
    });

    [["app_page.section5b.wgs84", "epsg:4326"],
     ["app_page.section5b.web_mercator", "epsg:3857"],
     ["app_page.section5b.laea_europe", "epsg:3035"],
     ["app_page.section5b.usa_albers", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs"],
     ["app_page.section5b.british_national_grid", "epsg:27700"],
     ["app_page.section5b.lambert93", "epsg:2154"],
     ["app_page.section5b.eckert_4", "+proj=eck4 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs "],
     ["app_page.section5b.proj4_prompt", "proj4string"]].forEach(projection => {
        selec_projection.append("option").attrs({class: 'i18n', value: projection[1], 'data-i18n': projection[0]}).text(i18next.t(projection[0]));
    });

    selec_type.on("change", function(){
        if(this.value == "TopoJSON" || this.value == "KML" || this.value == "GeoJSON"){
            selec_projection.node().options.selectedIndex = 0;
            selec_projection.attr("disabled", true);
            ok_button.disabled = "";
        } else {
            selec_projection.attr("disabled", null);
        }
    });

    selec_projection.on("change", function(){
        if(this.value == "proj4string"){
            proj4_input.style("display", "initial");
            if(proj4_input.node().value == '' || proj4_input.node().value == undefined)
                ok_button.disabled = "true";
        } else {
            proj4_input.style("display", "none");
            ok_button.disabled = "";
        }
    });
    let ok_button = dv5b.append('p').style('float', 'left')
        .append("button")
        .attrs({"id": "export_button_section5b", "class": "i18n button_st4", "data-i18n": "[html]app_page.section5b.export_button"})
        .on("click", function(){
            let type_export = document.getElementById("select_export_type").value,
                export_name = document.getElementById("export_filename").value;
            if(type_export === "svg"){
                export_compo_svg(export_name);
            } else if (type_export === "geo"){
                let layer_name = document.getElementById('layer_to_export').value,
                    type = document.getElementById('datatype_to_use').value,
                    proj = document.getElementById('projection_to_use').value,
                    proj4value = document.getElementById('proj4str').value;
                export_layer_geo(layer_name, type, proj, proj4value);
                //make_export_layer_box()
            } else if (type_export === "png"){
                let type_export = document.getElementById("select_png_format").value,
                    ratio;
                if(type_export === "web"){
                    ratio = +document.getElementById("export_png_height").value / +h;
                } else {
                    type_export = "paper";
                    ratio = (+document.getElementById("export_png_height").value * 118.11) / +h;
                }
                _export_compo_png(type_export, ratio, export_name);
            }
        });

    let proj_options = d3.select(".header_options_projection").append("div").attr("id", "const_options_projection").style("display", "inline");

    let rotation_param = proj_options.append("span");

    rotation_param.append("input")
            .attrs({type: "range", id: "form_projection_center", value: 0.0,
                    min: -180.0, max: 180.0, step: 0.1})
            .styles({width: "120px", margin: "0px", "vertical-align": "text-top"})
            .on("input", function(){
                handle_proj_center_button([this.value, null, null]);
                document.getElementById("proj_center_value_txt").value = +this.value;
            });

    rotation_param.append("input")
            .attrs({type: "number", class: "without_spinner", id: "proj_center_value_txt",
                    min: -180.0, max: 180.0, value: 0, step: "any"})
            .styles({width: "38px", "margin": "0 10px",
                     "color": " white", "background-color": "#000",
                     "vertical-align": "calc(20%)"})
            .on("change", function(){
                let val = +this.value,
                    old_value = +document.getElementById('form_projection_center').value;
                if(this.value.length == 0 || val > 180 || val < -180){
                    this.value = old_value;
                    return;
                } else { // Should remove trailing zeros (right/left) if any :
                    this.value = +this.value;
                }
                handle_proj_center_button([this.value, null, null]);
                document.getElementById("form_projection_center").value = this.value;
            });
    rotation_param.append("span")
            .style("vertical-align", "calc(20%)")
            .html("°");

    let proj_select = proj_options.append("select")
            .attr("id","form_projection")
            .styles({"align": "center", "color": " white", "background-color": "#000", "border": "none"})
            .on("change", function(){
                current_proj_name = this.selectedOptions[0].textContent;
                change_projection(this.value);
            });
    d3.json("/static/json/projections.json", function(json) {
       json.forEach(function(d) {
            available_projections.set(d.name, d.projection);
            proj_select.append("option").text(d.name).attr("value", d.projection);
        });
        let last_project = window.localStorage.getItem("magrit_project");
        if(resume_project === true && last_project){
            apply_user_preferences(json_params);
        } else if (last_project && last_project.length && last_project.length > 0) {
            swal({title: "",
                  // text: i18next.t("app_page.common.resume_last_project"),
                  allowOutsideClick: false,
                  allowEscapeKey: false,
                  type: "question",
                  showConfirmButton: true,
                  showCancelButton: true,
                  confirmButtonText: i18next.t("app_page.common.new_project"),
                  cancelButtonText: i18next.t("app_page.common.resume_last"),
                }).then(() => {
                    null;
                 }, dismiss => {
                   apply_user_preferences(last_project);
                 })
        } else {
            // If we don't want to resume from the last project, we can
            // remove it :
            window.localStorage.removeItem("magrit_project");
        }
        proj_select.node().value = "d3.geoNaturalEarth().scale(400).translate([375, 50])";
    });

    let const_options = d3.select(".header_options_right").append("div").attr("id", "const_options").style("display", "inline");

    const_options.append('button')
        .attrs({class: 'const_buttons i18n', id: 'new_project', 'data-i18n': '[tooltip-title]app_page.tooltips.new_project', 'data-tooltip-position': 'bottom'})
        .styles({cursor: 'pointer', background: 'transparent', 'margin-top': '5px'})
        .html('<img src="/static/img/File_font_awesome_blank.png" width="25" height="auto" alt="Load project file"/>')
        .on('click', function(){
            window.localStorage.removeItem("magrit_project");
            window.removeEventListener("beforeunload", beforeUnloadWindow);
            location.reload();
        });

    const_options.append('button')
        .attrs({class: 'const_buttons i18n', id: 'load_project', 'data-i18n': '[tooltip-title]app_page.tooltips.load_project_file', 'data-tooltip-position': 'bottom'})
        .styles({cursor: 'pointer', background: 'transparent', 'margin-top': '5px'})
        .html('<img src="/static/img/Folder_open_alt_font_awesome.png" width="25" height="auto" alt="Load project file"/>')
        .on('click', load_map_template);

    const_options.append('button')
        .attrs({class: 'const_buttons i18n', id: 'save_file_button', 'data-i18n': '[tooltip-title]app_page.tooltips.save_file', 'data-tooltip-position': 'bottom'})
        .styles({cursor: 'pointer', background: 'transparent', 'margin': 'auto'})
        .html('<img src="/static/img/Breezeicons-actions-22-document-save-blank.png" width="25" height="auto" alt="Save project to disk"/>')
        .on('click', save_map_template)

    const_options.append('button')
        .attrs({class: 'const_buttons i18n', id: 'documentation_link', 'data-i18n': '[tooltip-title]app_page.tooltips.documentation', 'data-tooltip-position': 'bottom'})
        .styles({cursor: 'pointer', background: 'transparent', 'margin-top': '5px'})
        .html('<img src="/static/img/Documents_icon_-_noun_project_5020_white.svg" width="20" height="auto" alt="Documentation"/>')
        .on('click', function(){
            window.open('/static/book/index.html', 'DocWindow', "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
        });

    const_options.append("button")
        .attrs({id: "help_btn", class: "const_buttons i18n",
                "data-i18n": "[tooltip-title]app_page.help_box.tooltip_btn",
                "data-tooltip-position": "bottom"})
        .styles({cursor: "pointer", background: "transparent"})
        .html('<img src="/static/img/High-contrast-help-browser_blank.png" width="20" height="20" alt="export_load_preferences" style="margin-bottom:3px;"/>')
        .on("click", function(){
            if(document.getElementById("menu_lang"))
                document.getElementById("menu_lang").remove();
            let click_func = function(window_name, target_url){
                    window.open(target_url, window_name, "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
            }
            let box_content = '<div class="about_content">' +
                '<p style="font-size: 0.8em; margin-bottom:auto;"><span>' + i18next.t('app_page.help_box.version', {version: "0.1.0"}) + '</span></p>' +
                '<p><b>' + i18next.t('app_page.help_box.useful_links') + '</b></p>' +
                // '<p><button class="swal2-styled swal2_blue btn_doc">' + i18next.t('app_page.help_box.doc') + '</button></p>' +
                '<p><button class="swal2-styled swal2_blue btn_doc">' + i18next.t('app_page.help_box.carnet_hypotheses') + '</button></p>' +
                '<p><button class="swal2-styled swal2_blue btn_contact">' + i18next.t('app_page.help_box.contact') + '</button></p>' +
                '<p><button class="swal2-styled swal2_blue btn_gh">' + i18next.t('app_page.help_box.gh_link') + '</button></p>' +
                '<p style="font-size: 0.8em; margin:auto;"><span>' + i18next.t('app_page.help_box.credits') + '</span></p></div>';
            swal({
                title: i18next.t("app_page.help_box.title"),
                html: box_content,
                showCancelButton: true,
                showConfirmButton: false,
                cancelButtonText: i18next.t('app_page.common.close'),
                animation: "slide-from-top",
                onOpen: function(){
                    let content = document.getElementsByClassName('about_content')[0];
                    let credit_link = content.querySelector('#credit_link');
                    credit_link.style.fontWeight = "bold";
                    credit_link.style.cursor = "pointer";
                    credit_link.color = "#000";
                    credit_link.onclick = function(){
                        window.open('http://riate.cnrs.fr', 'RiatePage', "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
                    };
                    content.querySelector('.btn_doc').onclick = function(){
                        window.open('http://magrit.hypotheses.org/', "Carnet hypotheses", "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
                    };
                    content.querySelector('.btn_contact').onclick = function(){
                        window.open('/contact', 'ContactWindow', "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
                    };
                    content.querySelector('.btn_gh').onclick = function(){
                        window.open('https://www.github.com/riatelab/magrit', 'GitHubPage', "toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes").focus();
                    };
                }
             }).then(inputValue => { null; },
                     dismissValue => { null; });
        });

    const_options.append("button")
        .attrs({id: "current_app_lang", class: "const_buttons"})
        .styles({color: "white", cursor: 'pointer',
                 "font-size": "14px", "vertical-align": "super",
                 background: "transparent", "font-weight": "bold"})
        .html(i18next.language)
        .on("click", function(){
            if(document.getElementById("menu_lang"))
                document.getElementById("menu_lang").remove();
            else {
                let current_lang = i18next.language;
                let other_lang = current_lang == "en" ? "fr" : "en"
                let actions = [
                    {"name": current_lang, "callback": change_lang},
                    {"name": other_lang, "callback": change_lang}
                    ];
                let menu = document.createElement("div");
                menu.style.top = "40px";
                menu.style.right = "0px";
                menu.className = "context-menu";
                menu.id = "menu_lang";
                menu.style.minWidth = "30px";
                menu.style.width = "50px";
                menu.style.background = "#000";
                let list_elems = document.createElement("ul");
                menu.appendChild(list_elems);
                for (let i = 0; i < actions.length; i++) {
                    let item = document.createElement("li"),
                        name = document.createElement("span");
                    list_elems.appendChild(item);
                    item.setAttribute("data-index", i);
                    item.style.textAlign = "right";
                    item.style.paddingRight = "16px";
                    name.className = "context-menu-item-name";
                    name.style.color = "white";
                    name.textContent = actions[i].name;
                    item.appendChild(name);
                    item.onclick = () => {
                        actions[i].callback();
                        menu.remove();
                    };
                }
                document.querySelector("body").appendChild(menu);
            }
        });

    // Zoom-in, Zoom-out, Info, Hand-Move and RectZoom buttons (on the top of the map) :
    let lm = map_div
        .append("div")
        .attr("class", "light-menu")
        .styles({position:"absolute", right:"0px", bottom: "0px"});

    let lm_buttons = [
        {id: "zoom_out", "i18n": "[tooltip-title]app_page.lm_buttons.zoom-", "tooltip_position": "left", class: "zoom_button i18n", html: "-"},
        {id: "zoom_in", "i18n": "[tooltip-title]app_page.lm_buttons.zoom+", "tooltip_position": "left", class: "zoom_button i18n", html: "+"},
        {id: "info_button", "i18n": "[tooltip-title]app_page.lm_buttons.i", "tooltip_position": "left", class: "info_button i18n", html: "i"},
        {id: "hand_button", "i18n": "[tooltip-title]app_page.lm_buttons.hand_button", "tooltip_position": "left", class: "hand_button active i18n", html: '<img src="/static/img/Twemoji_1f513.svg" width="18" height="18" alt="Hand_closed"/>'}/*,
        {id: "brush_zoom_button", class: "brush_zoom_button", "i18n": "[tooltip-title]app_page.lm_buttons.zoom_rect", "tooltip_position": "left", html: '<img src="/static/img/Inkscape_icons_zoom_fit_selection_blank.svg" width="18" height="18" alt="Zoom_select"/>'}*/
    ];

    let selec = lm.selectAll("input")
        .data(lm_buttons).enter()
        .append('p').style("margin", "auto")
            .insert("button")
            .attrs((d,i) => ({
              "data-tooltip-position": d.tooltip_position,
              "class": d.class,
              "data-i18n": d.i18n,
              "id": d.id})
              )
            .html(d => d.html);

    // Trigger actions when buttons are clicked and set-up the initial view :
    d3.selectAll(".zoom_button").on("click", zoomClick);
    document.getElementById("info_button").onclick = displayInfoOnMove;
    document.getElementById("hand_button").onclick = handle_click_hand;
    //document.getElementById("brush_zoom_button").onclick = brush_rect;

    // Already append the div for displaying information on features,
    // setting it currently unactive until it will be requested :
    d3.select("body").append("div")
        .attr("id", "info_features")
        .classed("active", false)
        .style("display", "none")
        .html("");

    prepare_drop_section();
    accordionize(".accordion");
    document.getElementById("btn_s1").dispatchEvent(new MouseEvent("click"));
    new Sortable(document.getElementById("sortable"), {
        animation: 100,
        onUpdate: function(a){
          // Set the layer order on the map in concordance with the user changes
          // in the layer manager with a pretty rusty 'sorting' algorythm :
          let at_end = null;
          if(document.getElementById("info_features").className == "active"){
            displayInfoOnMove();
            at_end = true;
          }
          let desired_order = [],
              actual_order = [],
              layers = layers_node.getElementsByClassName("layer");

          for(let i=0, len_i = a.target.childNodes.length; i < len_i; i++){
              let n = a.target.childNodes[i].getAttribute("layer_name");
              desired_order[i] = _app.layer_to_id.get(n);
              actual_order[i] = layers[i].id;
          }
          for(let i = 0, len = desired_order.length; i < len; i++){
              let lyr1 = document.getElementById(desired_order[i]),
                  lyr2 = document.getElementById(desired_order[i+1]) || document.getElementById(desired_order[i]);
              layers_node.insertBefore(lyr2, lyr1);
          }
         if(at_end) displayInfoOnMove();
        },
        onStart: event => {
            document.body.classList.add("no-drop")
        },
        onEnd: event => {
            document.body.classList.remove("no-drop");
        },
    });
}

function encodeId(s) {
    if (s==='') return '_';
    return s.replace(/[^a-zA-Z0-9_-]/g, function(match) {
        return '_'+match[0].charCodeAt(0).toString(16)+'_';
    });
}

function bindTooltips(dataAttr="tooltip-title"){
    // bind the mains tooltips
    // let existing_tooltips = document.querySelectorAll(".bs_tooltip");
    // for(let i = existing_tooltips.length - 1; i > -1; i--){
    //     existing_tooltips[i].remove();
    // }
    let tooltips_elem = document.querySelectorAll("[" + dataAttr + "]");
    for(let i = tooltips_elem.length - 1; i > -1; i--){
        new Tooltip(tooltips_elem[i], {
            dataAttr: dataAttr,
            animation: "slideNfade",
            duration: 50,
            delay: 100,
            container: document.getElementById("twbs"),
            placement: tooltips_elem[i].getAttribute("data-tooltip-position")
        });
    }
}


function make_eye_button(state){
    if(state == "open"){
        let eye_open = document.createElement("img");
        eye_open.setAttribute("src", "/static/img/b/eye_open.svg");
        eye_open.setAttribute("class", "active_button i18n")
        eye_open.setAttribute("id", "eye_open");
        eye_open.setAttribute("width", 17);
        eye_open.setAttribute("height", 17);
        eye_open.setAttribute("alt", "Visible");
        return eye_open;
    } else if (state == "closed"){
        let eye_closed = document.createElement("img");
        eye_closed.setAttribute("src", "/static/img/b/eye_closed.svg");
        eye_closed.setAttribute("class", "active_button i18n");
        eye_closed.setAttribute("id", "eye_closed");
        eye_closed.setAttribute("width", 17);
        eye_closed.setAttribute("height", 17);
        eye_closed.setAttribute("alt", "Not visible");
        return eye_closed;
    }
}

function change_lang(){
    let new_lang = this.name;
    if(new_lang == i18next.language){
        return;
    } else {
        docCookies.setItem("user_lang", new_lang, 31536e3, "/");
        let other_lang = new_lang == "fr" ? "en" : "fr";
        i18next.changeLanguage(new_lang, () => {
            localize(".i18n");
            bindTooltips();
        });
        document.getElementById("current_app_lang").innerHTML = new_lang;
        let menu = document.getElementById("menu_lang");
        if(menu)
            menu.remove();
    }
}

function make_ico_choice(){
    let list_fun_ico = ['prop.png',
                        'choro.png',
                        'typo.png',
                        'choroprop.png',
                        'proptypo.png',
                        'grid.png',
                        'cartogram.png',
                        'smooth.png',
                        'discont.png',
                        'typosymbol.png',
                        'flow.png'];

    let function_panel = section2_pre.append("div")
                            .attr("id", "list_ico_func");

    for(let i = 0, len_i = list_fun_ico.length; i < len_i; i++){
        let ico_name = list_fun_ico[i],
            func_name = ico_name.split('.')[0],
            func_desc = get_menu_option(func_name).desc,
            margin_value = i == 8 ? '5px 16px 5px 55px' : '5px 16px';
        function_panel
            .insert("img")
            .styles({margin: margin_value, cursor: 'pointer', width: '50px', "float": "left", "list-style": "none"})
            .attrs({class: 'i18n', 'data-i18n': ['[title]app_page.func_description.', func_name].join(''),
                    src: ['/static/img/func_icons2/', ico_name].join(''), id: 'button_' + func_name})
            .on("click", function(){
                // Do some clean-up related to the previously displayed options :
                if(window.fields_handler){
                    if(this.classList.contains('active')){
                        switch_accordion_section('btn_s2b');
                        return;
                    } else {
                        clean_menu_function();
                    }
                }

                // Highlight the icon of the selected functionnality :
                this.style.filter = "invert(100%) saturate(200%)";
                this.classList.add('active');

                document.getElementById('accordion2b').style.display = '';

                // Get the function to fill the menu with the appropriate options (and do it):
                _app.current_functionnality = get_menu_option(func_name);
                let make_menu = eval(_app.current_functionnality.menu_factory);
                window.fields_handler = eval(_app.current_functionnality.fields_handler);
                make_menu();

                // Replace the title of the section:
                let selec_title = document.getElementById("btn_s2b");
                selec_title.innerHTML = '<span class="i18n" data-i18n="app_page.common.representation">' +
                                        i18next.t("app_page.common.representation") +
                                        '</span><span> : </span><span class="i18n" data-i18n="app_page.func_title.' +
                                        _app.current_functionnality.name +
                                        '">' +
                                        i18next.t("app_page.func_title."+ _app.current_functionnality.name) +
                                        '</span>';
                selec_title.style.display = '';

                // // Bind the help tooltip (displayed when mouse over the 'i' icon) :
                // let btn_info = document.getElementById("btn_info");
                // btn_info.setAttribute("data-title", i18next.t("app_page.func_help." + func_name + ".title"));
                // btn_info.setAttribute("data-content", i18next.t("app_page.func_help." + func_name + ".block"));
                // new Popover(btn_info,{
                //     container: document.getElementById("twbs"),
                //     customClass: "help-popover",
                //     dismiss: "true",
                //     dismissOutsideClick: true,
                //     placement: "right"
                // });

                // Fill the field of the functionnality with the field
                // of the targeted layer if already uploaded by the user :
                if(_app.targeted_layer_added){
                    let target_layer = Object.getOwnPropertyNames(user_data)[0];
                    fields_handler.fill(target_layer);
                }

                // Specific case for flow/link functionnality as we are also
                // filling the fields with data from the uploaded tabular file if any :
                if(func_name == "flow" && joined_dataset){
                    fields_handler.fill();
                }

                switch_accordion_section('btn_s2b');
            });
    }
}

var w = Math.round(window.innerWidth - 361),
    h = window.innerHeight - 55;

var existing_lang = ["en", "fr"];

var proj = d3.geoNaturalEarth().scale(1).translate([0,0]);

var path = d3.geoPath().projection(proj).pointRadius(4),
    t = proj.translate(),
    s = proj.scale(),
    current_proj_name = "Natural Earth",
    available_projections = new Map(),
    zoom = d3.zoom().on("zoom", zoom_without_redraw),
    sample_no_values = new Set(["Sphere", "Graticule", "World"]);

/*
A bunch of global variable, storing oftently reused informations :
    - user_data[layer_name] : will be an Array of Objects containing data for each features of the targeted layer
            (+ the joined features if a join is done)
    - result_data[layer_name] : the same but for any eventual result layers (like Stewart, gridded, etc.)
    - joined_dataset : the joined dataset (read with d3.csv then pushed in the first slot of this array)
    - field_join_map : an array containg mapping between index of geom layer and index of ext. dataset
    - current_layers : the main object describing **all** the layers on the map (incunding detailed (ie. by features) styling properties if needed)
*/

var user_data = new Object(),
    result_data = new Object(),
    joined_dataset = [],
    field_join_map  = [],
    current_layers = new Object(),
    dataset_name = undefined,
    canvas_rotation_value = undefined,
    map_div = d3.select("#map");

// The "map" (so actually the `map` variable is a reference to the main `svg` element on which we are drawing)
var map = map_div.style("width", w+"px").style("height", h+"px")
            .append("svg")
            .attrs({'id': 'svg_map', 'width': w, 'height': h})
            .style("position", "absolute")
            .on("contextmenu", function(event){ d3.event.preventDefault(); })
            .call(zoom);

var svg_map = map.node();
// map.on("contextmenu", function(event){ d3.event.preventDefault(); });

var defs = map.append("defs");
var svg_layers = map.append('g').attrs({'id': 'layers_node'});
var svg_legend = map.append('g').attrs({'id': 'legend_node'});

var _app = {
    to_cancel: undefined,
    targeted_layer_added: false,
    current_functionnality: undefined,
    layer_to_id: new Map([["Sphere", "Sphere"], ["World", "World"], ["Graticule", "Graticule"]]),
    id_to_layer: new Map([["Sphere", "Sphere"], ["World", "World"], ["Graticule", "Graticule"]])
};

// A bunch of references to the buttons used in the layer manager
// and some mapping to theses reference according to the type of geometry :
const button_trash = ' <img src="/static/img/Trash_font_awesome.png" id="trash_button" width="15" height="15" alt="trash_button"/>',
    button_legend = ' <img src="/static/img/qgis_legend.png" id="legend_button" width="17" height="17" alt="legend_button"/>',
    button_zoom_fit = ' <img src="/static/img/Inkscape_icons_zoom_fit_page.png" id="zoom_fit_button" width="16" height="16" alt="zoom_button"/></button>',
    button_table = ' <img src="/static/img/dataset.png" id="browse_data_button" width="16" height="16" alt="dataset_button"/></button>',
    button_type = new Map([
        ["Point", '<img src="/static/img/type_geom/dot.png" class="ico_type" width="17" height="17" alt="Point"/>'],
        ["Line", '<img src="/static/img/type_geom/line.png" class="ico_type" width="17" height="17" alt="Line"/>'],
        ["Polygon", '<img src="/static/img/type_geom/poly.png" class="ico_type" width="17" height="17" alt="Polygon"/>']
        ]);

const button_result_type = new Map([
        ["flow", '<img src="/static/img/type_geom/layer_flow.svg" class="ico_type" width="17" height="17" alt="flow"/>'],
        ["symbol", '<img src="/static/img/type_geom/layer_symbol.svg" class="ico_type" width="17" height="17" alt="symbol"/>'],
        ["grid", '<img src="/static/img/type_geom/layer_grid.svg" class="ico_type" width="17" height="17" alt="grid"/>'],
        ["propchoro", '<img src="/static/img/type_geom/layer_propchoro.svg" class="ico_type" width="17" height="17" alt="propchoro"/>'],
        ["typo", '<img src="/static/img/type_geom/layer_typo.svg" class="ico_type" width="17" height="17" alt="typo"/>'],
        ["discont", '<img src="/static/img/type_geom/layer_disc.svg" class="ico_type" width="17" height="17" alt="discont"/>'],
        ["cartogram", '<img src="/static/img/type_geom/layer_cartogram.svg" class="ico_type" width="17" height="17" alt="cartogram"/>'],
        ["label", '<img src="/static/img/type_geom/layer_label.svg" class="ico_type" width="17" height="17" alt="label"/>'],
        ["choro", '<img src="/static/img/type_geom/layer_choro.svg" class="ico_type" width="17" height="17" alt="choro"/>'],
        ["smooth", '<img src="/static/img/type_geom/layer_smooth.svg" class="ico_type" width="17" height="17" alt="smooth"/>'],
        ["prop", '<img src="/static/img/type_geom/layer_prop.svg" class="ico_type" width="17" height="17" alt="prop"/>']
        ]);

const eye_open0 = '<img src="/static/img/b/eye_open.svg" class="active_button" id="eye_open"  width="17" height="17" alt="Visible"/>';

// Reference to the sys run button already in two requested sizes are they are called many times :
const sys_run_button = '<img src="/static/img/High-contrast-system-run.svg" width="22" height="22" style="vertical-align: inherit;" alt="submit"/>',
      sys_run_button_t2 = '<img src="/static/img/High-contrast-system-run.svg" class="style_target_layer" width="18" height="18" alt="Layer_rendering" style="float:right;"/>';

// Shortcut to the name of the methods offered by geostats library:
const discretiz_geostats_switch = new Map([
        ["jenks", "getJenks"],
        ["equal_interval", "getEqInterval"],
        //["std_dev", "getStdDeviation"],
        ["quantiles", "getQuantile"],
        ["arithmetic_progression", "getArithmeticProgression"],
        ["Q6", "getBreaksQ6"],
        ["geometric_progression", "getGeometricProgression"]
    ]);

// Reference to the availables fonts that the user could select :
const available_fonts = [
    ['Arial', 'Arial,Helvetica,sans-serif'],
    ['Arial Black', 'Arial Black,Gadget,sans-serif'],
    ['Arimo', 'Arimo,sans-serif'],
    ['Baloo Bhaina', 'Baloo Bhaina,sans-serif'],
    ['Bitter', 'Bitter,sans-serif'],
    ['Dosis', 'Dosis,sans-serif'],
    ['Roboto', 'Roboto,sans-serif'],
    ['Lobster', 'Lobster,sans-serif'],
    ['Impact', 'Impact,Charcoal,sans-serif'],
    ['Inconsolata', 'Inconsolata,sans-serif'],
    ['Georgia', 'Georgia,serif'],
    ['Lobster', 'Lobster,serif'],
    ['Lucida', 'Lucida Sans Unicode,Lucida Grande,sans-serif'],
    ['Palatino', 'Palatino Linotype,Book Antiqua,Palatino,serif'],
    ['Roboto', 'Roboto'],
    ['Scope One', 'Scope One'],
    ['Tahoma', 'Tahoma,Geneva,sans-serif'],
    ['Trebuchet MS', 'Trebuchet MS, elvetica,sans-serif'],
    ['Verdana', 'Verdana,Geneva,sans-serif']
    ];

// This variable have to be (well, we could easily do this in an other way!) up to date
// with the style-fonts.css file as we are using their order to lookup for their definition
// the .css file.
const customs_fonts = ['Arimo', 'Baloo Bhaina', 'Bitter', 'Dosis', 'Inconsolata', 'Lobster', 'Roboto', 'Scope One'];

(function(){
    let lang = docCookies.getItem('user_lang') || window.navigator.language.split('-')[0],
        resume_project = undefined;

    document.querySelector("noscript").remove();

    if(window.location.search){
        let old_url = window.location.search;
        if(old_url.indexOf("?resume") > -1){
            resume_project = true;
        }
        if (typeof (history.replaceState) != "undefined") {
            // replaceState should avoid creating a new entry on the history
            var obj = {Page: window.location.search, Url: window.location.pathname};
            history.replaceState(obj, obj.Page, obj.Url);
        }
    }

    lang = existing_lang.indexOf(lang) > -1 ? lang : 'en';
    i18next.use(i18nextXHRBackend)
      .init({
          debug: true,
          lng: lang,
          fallbackLng: existing_lang[0],
          backend: {
            loadPath: "/static/locales/{{lng}}/translation.json"
          }
    }, (err, t) => {
        if(err)
            throw err;
        else {
            window.localize = locI18next.init(i18next);
            setUpInterface(resume_project);
            localize(".i18n");
            bindTooltips();
        }
    });
})();


////////////////
// To sort:
////////////////

// To bind the set of small buttons (trash icon, paint icon, active/deactive visibility, info tooltip, etc..)
// which are on each feature representing a layer in the layer manager
// (the function is called each time that a new feature is put in this layer manager)
function binds_layers_buttons(layer_name){
    if(layer_name == undefined){
        alert("This shouldn't happend");
        return;
    }
    let layer_id = _app.layer_to_id.get(layer_name);
    let sortable_elem = d3.select("#sortable").select("." + layer_id);
    sortable_elem.on("dblclick", () => { handle_click_layer(layer_name); });
    sortable_elem.on("contextmenu", () => { d3.event.preventDefault(); return; });
    sortable_elem.select("#trash_button").on("click", () => { remove_layer(layer_name); });
    sortable_elem.select(".active_button").on("click", () => { handle_active_layer(layer_name); });
    sortable_elem.select(".style_button").on("click", () => { handle_click_layer(layer_name); });
    sortable_elem.select(".style_target_layer").on("click", () => { handle_click_layer(layer_name) });
    sortable_elem.select("#legend_button").on("click", () => { handle_legend(layer_name); });
    sortable_elem.select("#browse_data_button").on("click", () => { boxExplore2.create(layer_name); });
    sortable_elem.select("#zoom_fit_button").on("click", () => {
        center_map(layer_name);
        zoom_without_redraw();
    });
    // TODO : re-add a tooltip when the mouse is over that sortable element ?
}

// Function to display information on the top layer (in the layer manager)
function displayInfoOnMove(){
    var info_features = d3.select("#info_features");
    if(info_features.classed("active")){
        d3.select(".info_button").style('box-shadow', null);
        svg_layers.selectAll(".layer").selectAll("path").on("mouseover", null);
        svg_layers.selectAll(".layer").selectAll("circle").on("mouseover", null);
        svg_layers.selectAll(".layer").selectAll("rect").on("mouseover", null);
        info_features.classed("active", false);
        info_features.node().innerHTML = "";
        info_features.style("display", "none");
        svg_map.style.cursor = "";
    } else {
        let layers = layers_node.getElementsByClassName("layer"),
            nb_layer = layers.length,
            top_visible_layer = null;

        for(let i = nb_layer-1; i > -1; i--){
            if(layers[i].style.visibility != "hidden"){
                top_visible_layer = _app.id_to_layer.get(layers[i].id);
                break;
            }
        }

        if(!top_visible_layer){
            swal("", i18next.t("app_page.common.error_no_visible"), "error");
            return;
        }

        let id_top_layer = "#" + _app.layer_to_id.get(top_visible_layer),
            symbol = current_layers[top_visible_layer].symbol;

        d3.select(".info_button").style('box-shadow', 'inset 2px 2px 1px black');
        if(symbol){
            let ref_layer_name = current_layers[top_visible_layer].ref_layer_name;
            svg_layers.select(id_top_layer).selectAll(symbol).on("mouseover", function(d,i){
                let txt_info = ["<h3>", top_visible_layer, "</h3><i>Feature ",
                                i + 1, "/", current_layers[top_visible_layer].n_features, "</i><p>"];
                let properties = result_data[top_visible_layer][i];
                Object.getOwnPropertyNames(properties).forEach(function(el, i){
                    txt_info.push("<br><b>"+el+"</b> : "+properties[el]);
                    });
                txt_info.push("</p>");
                info_features.node().innerHTML = txt_info.join('');
                info_features.style("display", null);
                });
        } else {
            symbol = "path"
            svg_layers.select(id_top_layer).selectAll("path").on("mouseover", function(d,i){
                let txt_info = ["<h3>", top_visible_layer, "</h3><i>Feature ",
                                i + 1, "/", current_layers[top_visible_layer].n_features, "</i><p>"];
                Object.getOwnPropertyNames(d.properties).forEach(function(el, i){
                    txt_info.push("<br><b>"+el+"</b> : "+d.properties[el]);
                    });
                txt_info.push("</p>");
                info_features.node().innerHTML = txt_info.join('');
                info_features.style("display", null);
                });
        }
        svg_layers.select(id_top_layer).selectAll(symbol).on("mouseout", function(){
                info_features.node().innerHTML = "";
                info_features.style("display", "none");
        });
        info_features.classed("active", true);
        svg_map.style.cursor="help";
    }
}

/*
function reproj_lgd_elem(){
    let scalable_elem = document.querySelectorAll(".scalable-legend");
    for(let i = scalable_elem.length - 1; i > -1; i--){
        let className = scalable_elem[i].className;
        if(className.indexOf("arrow") > -1){

        } else if (className.indexOf("user_ellipse") > -1){
            let ellipse = scalable_elem[i].querySelector("ellipse");
            ellipse.cx.baseVal.value = ;
            ellipse.cy.baseVal.value = ;
        }
    }
}
*/

function reproj_symbol_layer(){
  for(let lyr_name in current_layers){
    if(current_layers[lyr_name].renderer
        && (current_layers[lyr_name].renderer.indexOf('PropSymbol') > -1
            || current_layers[lyr_name].renderer.indexOf('TypoSymbols')  > -1
            || current_layers[lyr_name].renderer.indexOf('Label')  > -1 )){
      let symbol = current_layers[lyr_name].symbol;

      let size_rap = current_layers[lyr_name].proj_scale_draw === undefined ? 1 : proj.scale() / current_layers[lyr_name].proj_scale_draw;

      if (symbol == "text") { // Reproject the labels :
          svg_layers.select('#' + _app.layer_to_id.get(lyr_name))
                .selectAll(symbol)
                .attrs( d => {
                  let pt = path.centroid(d.geometry);
                  return {'x': pt[0], 'y': pt[1]};
                });
      } else if (symbol == "image"){ // Reproject pictograms :
          svg_layers.select('#' + _app.layer_to_id.get(lyr_name))
              .selectAll(symbol)
              .attrs(function(d,i){
                let coords = path.centroid(d.geometry),
                    size = size_rap * +this.getAttribute('width').slice(0, -2) / 2;
                return { 'x': coords[0] - size, 'y': coords[1] - size };
              });
      } else if(symbol == "circle"){ // Reproject Prop Symbol :
          svg_layers.select("#"+_app.layer_to_id.get(lyr_name))
              .selectAll(symbol)
              .style('display', d => isNaN(+path.centroid(d)[0]) ? "none" : undefined)
              .attrs( d => {
                let centroid = path.centroid(d);
                return {
                  'r': d.properties.prop_value * size_rap,
                  'cx': centroid[0],
                  'cy': centroid[1]
                };
              });
      } else if (symbol == "rect") { // Reproject Prop Symbol :
          svg_layers.select("#"+_app.layer_to_id.get(lyr_name))
              .selectAll(symbol)
              .style('display', d => isNaN(+path.centroid(d)[0]) ? "none" : undefined)
              .attrs( d => {
                let centroid = path.centroid(d),
                    size =  d.properties.prop_value * size_rap;
                return {
                  'height': size,
                  'width': size,
                  'x': centroid[0] - size / 2,
                  'y': centroid[1] - size / 2
                };
              });
      }
    } else if (current_layers[lyr_name].renderer && (
                current_layers[lyr_name].renderer == "DiscLayer" || current_layers[lyr_name].renderer == "Links")){
        let size_rap = proj.scale() / current_layers[lyr_name].proj_scale_draw;
        svg_layers.select("#"+_app.layer_to_id.get(lyr_name))
            .selectAll('path')
            .style("stroke-width", function(){ return this.style.strokeWidth * size_rap; });

    }
  }
}

function make_dialog_container(id_box, title, class_box){
        id_box = id_box || "dialog";
        title = title || "";
        class_box = class_box || "dialog";
        let container = document.createElement("div");
        container.setAttribute("id", id_box);
        container.setAttribute("class", "twbs modal fade" + " " + class_box);
        container.setAttribute("tabindex", "-1");
        container.setAttribute("role", "dialog");
        container.setAttribute("aria-labelledby", "myModalLabel");
        container.setAttribute("aria-hidden", "true");
        container.innerHTML = '<div class="modal-dialog"><div class="modal-content"></div></div>';
        document.getElementById("twbs").appendChild(container);

        container = document.getElementById(id_box);
        let modal_box = new Modal(container, {
            content: '<div class="modal-header">'
                      +'<button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>'
                      +'<h4 class="modal-title" id="gridModalLabel">' + title + '</h4>'
                      +'</div>'
                      +'<div class="modal-body">'
                      +'</div>'
                      +'<div class="modal-footer">'
                      +'<button type="button" class="btn btn-default btn_ok" data-dismiss="modal">' + i18next.t("app_page.common.confirm") + '</button>'
                      +'<button type="button" class="btn btn-primary btn_cancel">' + i18next.t("app_page.common.cancel") + '</button>'
                      +'</div>'
        });
        modal_box.open();
        return modal_box;
}

var overlay_under_modal = (function(){
    let twbs_div = document.querySelector('.twbs');
    let bg = document.createElement('div');
    bg.id = 'overlay_twbs';
    bg.style.width = "100%";
    bg.style.height = "100%";
    bg.style.position = "fixed";
    bg.style.zIndex = 99;
    bg.style.top = 0;
    bg.style.left = 0;
    bg.style.background = "rgba(0,0,0,0.4)";
    bg.style.display = "none";
    twbs_div.insertBefore(bg, twbs_div.childNodes[0]);
    return {
        display: function(){ bg.style.display = "" },
        hide: function(){ bg.style.display = "none"}
    };
})();

var make_confirm_dialog2 = (function(class_box, title, options){
    let existing = new Set();
    let get_available_id = () => {
        for(let i = 0; i < 50; i++){
            if(!existing.has(i)){
                existing.add(i);
                return i;
            }
        }
    }
    return function(class_box, title, options){
        class_box = class_box || "dialog";
        title = title || i18next.t("app_page.common.ask_confirm");
        options = options || {};

        let container = document.createElement("div");
        let new_id = get_available_id();

        container.setAttribute("id", "myModal_" + new_id);
        container.setAttribute("class", "twbs modal fade " + class_box);
        container.setAttribute("tabindex", "-1");
        container.setAttribute("role", "dialog");
        container.setAttribute("aria-labelledby", "myModalLabel");
        container.setAttribute("aria-hidden", "true");
        container.innerHTML = options.widthFitContent ? '<div class="modal-dialog fitContent"><div class="modal-content"></div></div>'
                            : '<div class="modal-dialog"><div class="modal-content"></div></div>';
        document.getElementById("twbs").appendChild(container);

        container = document.getElementById("myModal_" + new_id);
        let deferred = Q.defer();
        let html_content = options.html_content || "";
        let text_ok = options.text_ok || i18next.t("app_page.common.confirm");
        let text_cancel = options.text_cancel || i18next.t("app_page.common.cancel");
        let modal_box = new Modal(container, {
            backdrop: true,
            keyboard: false,
            content: '<div class="modal-header">'
                      +'<button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>'
                      +'<h4 class="modal-title" id="gridModalLabel">' + title + '</h4>'
                      +'</div>'
                      +'<div class="modal-body">'
                      +'<p>'
                      + html_content
                      +'</p>'
                      +'</div>'
                      +'<div class="modal-footer">'
                      +'<button type="button" class="btn btn-default btn_ok" data-dismiss="modal">' + text_ok + '</button>'
                      +'<button type="button" class="btn btn-primary btn_cancel">' + text_cancel + '</button>'
                      +'</div>'
        });
        modal_box.open();
        overlay_under_modal.display();
        container.querySelector(".btn_ok").onclick = function(){
            deferred.resolve(true);
            document.removeEventListener('keydown', helper_esc_key_twbs);
            existing.delete(new_id);
            overlay_under_modal.hide();
            container.remove();
        }
        let _onclose = () => {
            deferred.resolve(false);
            document.removeEventListener('keydown', helper_esc_key_twbs);
            modal_box.close();
            existing.delete(new_id);
            overlay_under_modal.hide();
            container.remove();
        };
        container.querySelector(".btn_cancel").onclick = _onclose;
        container.querySelector("#xclose").onclick = _onclose;
        function helper_esc_key_twbs(evt){
              evt = evt || window.event;
              let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
              if (isEscape) {
                  evt.stopPropagation();
                  _onclose();
                  document.removeEventListener('keydown', helper_esc_key_twbs);
              }
        }
        document.addEventListener('keydown', helper_esc_key_twbs);
        return deferred.promise;
    };
})();


// Wrapper to obtain confirmation before actually removing a layer :
function remove_layer(name){
    name = name || this.parentElement.parentElement.getAttribute("layer_name");
    swal({
        title: "",
        text: i18next.t("app_page.common.remove_layer", {layer: name}),
        type: "warning",
        customClass: 'swal2_custom',
        showCancelButton: true,
        allowOutsideClick: false,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: i18next.t("app_page.common.delete") + "!",
        cancelButtonText: i18next.t("app_page.common.cancel")
    }).then(() => { remove_layer_cleanup(name); },
            () => { null; }
    );    // ^^^^^^^^^^^^ Do nothing on cancel, but this avoid having an "uncaught exeption (cancel)" comming in the console if nothing is set here
                //  ^^^^^^^^^^^^^^^^^^^^^^^ Not sure anymore :/
}

function remove_ext_dataset(){
    swal({
        title: "",
        text: i18next.t("app_page.common.remove_tabular"),
        type: "warning",
        showCancelButton: true,
        allowOutsideClick: false,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: i18next.t("app_page.common.delete") + "!",
        cancelButtonText: i18next.t("app_page.common.cancel")
        }).then(() => {
                remove_ext_dataset_cleanup();
             }, () => { null; });
}

function remove_ext_dataset_cleanup(){
    field_join_map = new Array();
    joined_dataset = new Array();
    dataset_name = undefined;
    let ext_dataset_img = document.getElementById("img_data_ext");
    ext_dataset_img.setAttribute("src", "/static/img/b/addtabular.svg");
    ext_dataset_img.setAttribute("alt", "Additional dataset");
    ext_dataset_img.style.cursor = "pointer";
    ext_dataset_img.onclick = click_button_add_layer;
    let data_ext_txt = document.getElementById("data_ext");
    data_ext_txt.innerHTML = i18next.t("app_page.section1.add_ext_dataset");
    data_ext_txt.onclick = click_button_add_layer;
    data_ext_txt.classList.add('i18n');
    data_ext_txt.setAttribute('data-i18n', '[html]app_page.section1.add_ext_dataset')
    document.getElementById("remove_dataset").remove();
    document.getElementById("join_section").innerHTML = "";
}

// Do some clean-up when a layer is removed
// Most of the job is to do when it's the targeted layer which is removed in
// order to restore functionnalities to their initial states
function remove_layer_cleanup(name){
     let g_lyr_name = "#" + _app.layer_to_id.get(name);

     // Making some clean-up regarding the result layer :
    if(current_layers[name].is_result){
        svg_legend.selectAll([".lgdf_", name].join('')).remove();
        if(result_data.hasOwnProperty(name))
            delete result_data[name];
        if(current_layers[name].hasOwnProperty("key_name")
           && current_layers[name].renderer.indexOf("Choropleth") < 0
           && current_layers[name].renderer.indexOf("Categorical") < 0)
            send_remove_server(name);
    }

    // Remove the layer from the map and from the layer manager :
    svg_layers.select(g_lyr_name).remove();
    document.querySelector('#sortable .' + _app.layer_to_id.get(name)).remove()

    // Remove the layer from the "geo export" menu :
    let a = document.getElementById('layer_to_export').querySelector('option[value="' + name + '"]');
    if(a) a.remove();

    // Remove the layer from the "mask" section if the "smoothed map" menu is open :
    if(_app.current_functionnality && _app.current_functionnality.name == 'smooth'){
        let a = document.getElementById('stewart_mask').querySelector('option[value="' + name + '"]');
        if(a) a.remove();
        //Array.prototype.forEach.call(document.getElementById('stewart_mask').options, el => { if(el.value == name) el.remove(); });
    }

    // Reset the panel displaying info on the targeted layer if she"s the one to be removed :
    if(current_layers[name].targeted){
        // Updating the top of the menu (section 1) :
        //$("#input_geom").qtip("destroy");
        document.getElementById("remove_target").remove();
        d3.select("#img_in_geom")
            .attrs({"id": "img_in_geom", "class": "user_panel", "src": "/static/img/b/addgeom.png", "width": "24", "height": "24",  "alt": "Geometry layer"})
            .on('click',  click_button_add_layer);
        d3.select("#input_geom")
            .attrs({'class': 'user_panel i18n', 'data-i18n': '[html]app_page.section1.add_geom'})
            .html(i18next.t("app_page.section1.add_geom"))
            .on('click', click_button_add_layer);
        // Unfiling the fields related to the targeted functionnality:
        if(_app.current_functionnality){
            clean_menu_function();
        }

        // Update some global variables :
        field_join_map = [];
        user_data = new Object();
        _app.targeted_layer_added = false;

        // Redisplay the bottom of the section 1 in the menu allowing user to select a sample layer :
        document.getElementById('sample_zone').style.display = null;

        // Restore the state of the bottom of the section 1 :
        document.getElementById("join_section").innerHTML = "";

        // Disabled the button allowing the user to choose type for its layer :
        document.getElementById('btn_type_fields').setAttribute('disabled', 'true');

        reset_user_values();
    }

    // There is probably better ways in JS to delete the object,
    // but in order to make it explicit that we are removing it :
    delete current_layers[name];
}

// Change color of the background (ie the parent "svg" element on the top of which group of elements have been added)
function handle_bg_color(color){
    map.style("background-color", color);
}

function handle_click_hand(behavior){
    var hb = d3.select('.hand_button');
    behavior = behavior && typeof behavior !== "object" ? behavior : !hb.classed("locked") ? "lock" : "unlock";
    if(behavior == "lock"){
        hb.classed("locked", true);
        hb.html('<img src="/static/img/Twemoji_1f512.svg" width="18" height="18" alt="locked"/>');
        zoom.on("zoom", function(){
            let blocked = svg_map.__zoom;
            return function(){
                this.__zoom = blocked;
            }
        }());
    } else {
        hb.classed("locked", false);
        hb.html('<img src="/static/img/Twemoji_1f513.svg" width="18" height="18" alt="unlocked"/>');
        zoom.on("zoom", zoom_without_redraw);
        //map.on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
    }
}


//////////////////////////////////////////////////////////////////////////////
// Zooming functions (some from http://bl.ocks.org/linssen/7352810)
//////////////////////////////////////////////////////////////////////////////

function zoom_without_redraw(){
    var rot_val = canvas_rotation_value || "";
    var p_scale = proj.scale();
    var transform;
    if(!d3.event || !d3.event.transform || !d3.event.sourceEvent){
        transform = d3.zoomTransform(svg_map);
        svg_layers.selectAll(".layer")
          .transition()
          .duration(50)
          .style("stroke-width", function(){
                let lyr_name = _app.id_to_layer.get(this.id);
                return current_layers[lyr_name].fixed_stroke
                        ? this.style.strokeWidth / (p_scale / current_layers[lyr_name]['proj_scale_draw'])
                        : current_layers[lyr_name]['proj_scale_draw'] != undefined
                        ? current_layers[lyr_name]['stroke-width-const'] / (p_scale / current_layers[lyr_name]['proj_scale_draw-width-const']) / transform.k +  "px"
                        : current_layers[lyr_name]['stroke-width-const'] / transform.k +  "px";
            })
          .attr("transform", transform.toString() + rot_val);
        svg_legend.selectAll(".scalable-legend")
          .transition()
          .duration(50)
          .attr("transform", transform.toString() + rot_val);
    } else {
        svg_layers.selectAll(".layer")
          .transition()
          .duration(50)
          .style("stroke-width", function(){
                let lyr_name = _app.id_to_layer.get(this.id);
                return current_layers[lyr_name].fixed_stroke
                        ? this.style.strokeWidth / (p_scale / current_layers[lyr_name]['proj_scale_draw'])
                        : current_layers[lyr_name]['proj_scale_draw'] != undefined
                        ? current_layers[lyr_name]['stroke-width-const'] / (p_scale / current_layers[lyr_name]['proj_scale_draw-width-const']) / d3.event.transform.k +  "px"
                        : current_layers[lyr_name]['stroke-width-const'] / d3.event.transform.k +  "px";
            })
          .attr("transform", d3.event.transform + rot_val);
        svg_legend.selectAll(".scalable-legend")
          .transition()
          .duration(50)
          .attr("transform",  d3.event.transform + rot_val);
    }

    if(scaleBar.displayed){
        if(proj.invert) {
            scaleBar.update();
        } else {
            scaleBar.remove()
        }
    }
    if(window.legendRedrawTimeout){
        clearTimeout(legendRedrawTimeout);
    }
    window.legendRedrawTimeout = setTimeout(redraw_legends_symbols, 650);
    let zoom_params = svg_map.__zoom;
    document.getElementById("input-center-x").value = round_value(zoom_params.x, 2);
    document.getElementById("input-center-y").value = round_value(zoom_params.y, 2);
    document.getElementById("input-scale-k").value = round_value(zoom_params.k * proj.scale(), 2);
};

function redraw_legends_symbols(targeted_node){
    if(!targeted_node)
        var legend_nodes = legend_node.querySelectorAll("#legend_root2");
    else
        var legend_nodes = [targeted_node];

    for(let i=0; i<legend_nodes.length; ++i){
        let layer_id = legend_nodes[i].classList[2].split('lgdf_')[1],
            layer_name = _app.id_to_layer.get(layer_id),
            rendered_field = current_layers[layer_name].rendered_field,
            nested = legend_nodes[i].getAttribute("nested"),
            display_value = legend_nodes[i].getAttribute("display"),
            visible = legend_nodes[i].style.visibility;

        let transform_param = legend_nodes[i].getAttribute("transform"),
            rounding_precision = legend_nodes[i].getAttribute('rounding_precision'),
            lgd_title = legend_nodes[i].querySelector("#legendtitle").innerHTML,
            lgd_subtitle = legend_nodes[i].querySelector("#legendsubtitle").innerHTML;

        let rect_fill_value = legend_nodes[i].getAttribute("visible_rect") == "true" ? {
            color: legend_nodes[i].querySelector("#under_rect").style.fill,
            opacity: legend_nodes[i].querySelector("#under_rect").style.fillOpacity
        } : undefined;

        legend_nodes[i].remove();
        createLegend_symbol(layer_name, rendered_field, lgd_title, lgd_subtitle, nested, rect_fill_value, rounding_precision);
        let new_lgd = document.querySelector(["#legend_root2.lgdf_", layer_id].join(''));
        new_lgd.style.visibility = visible;
        new_lgd.setAttribute("display", display_value);
        if(transform_param)
            new_lgd.setAttribute("transform", transform_param);
    }
}

function interpolateZoom(translate, scale) {
    var self = this;
    var transform = d3.zoomTransform(svg_map);
    return d3.transition().duration(225).tween("zoom", function () {
        var iTranslate = d3.interpolate([transform.x, transform.y], translate),
            iScale = d3.interpolate(transform.k, scale);
        return function (t) {
            svg_map.__zoom.k = iScale(t);
            let _t =  iTranslate(t);
            svg_map.__zoom.x = _t[0];
            svg_map.__zoom.y = _t[1];
            zoom_without_redraw()
        };
    });
}

function zoomClick() {
    if(map_div.select("#hand_button").classed("locked"))
        return;
    var direction = (this.id === 'zoom_in') ? 1 : -1,
        factor = 0.1,
        target_zoom = 1,
        center = [w / 2, h / 2],
        transform = d3.zoomTransform(svg_map),
        translate = [transform.x, transform.y],
        translate0 = [],
        l = [],
        view = {x: translate[0], y: translate[1], k: transform.k};

    d3.event.preventDefault();
    target_zoom = transform.k * (1 + factor * direction);

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];

    interpolateZoom([view.x, view.y], view.k);
}


//////////////////////////////////////////////////////////////////////////////
// Rotation functions :
//////////////////////////////////////////////////////////////////////////////

function rotate_global(angle){
    canvas_rotation_value = ["rotate(", angle, ")"].join('');
    let zoom_transform = d3.zoomTransform(svg_map);

    svg_layers.selectAll(".layer")
      .transition()
      .duration(10)
      .attr("transform", [canvas_rotation_value,
                          ",translate(", [zoom_transform.x, zoom_transform.y], "),",
                          "scale(", zoom_transform.k, ")"].join(''));
    if(northArrow.displayed){
        let current_rotate = !isNaN(+northArrow.svg_node.attr("rotate")) ? +northArrow.svg_node.attr("rotate") : 0;
        northArrow.svg_node.attr("transform", [
            "rotate(", +angle + current_rotate, ",",northArrow.x_center,",", northArrow.y_center, ")"
            ].join(''));
    }
    zoom_without_redraw();
};

function isInterrupted(proj_name){
    return (proj_name.indexOf("interrupted") > -1
            || proj_name.indexOf("armadillo") > -1
            || proj_name.indexOf("healpix") > -1);
}

function handleClipPath(proj_name){
    proj_name = proj_name.toLowerCase();
    if(isInterrupted(proj_name)){
        let defs_sphere = defs.node().querySelector("#sphere"),
            defs_clipPath = defs.node().querySelector("clipPath");
        if(defs_sphere){ defs_sphere.remove(); }
        if(defs_clipPath){ defs_clipPath.remove(); }

        defs.append("path")
            .datum({type: "Sphere"})
            .attr("id", "sphere")
            .attr("d", path);

        defs.append("clipPath")
            .attr("id", "clip")
          .append("use")
            .attr("xlink:href", "#sphere");

        svg_layers.selectAll(".layer")
            .attr("clip-path", "url(#clip)");

        // svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
    } else {
        let defs_sphere = defs.node().querySelector("#sphere"),
            defs_clipPath = defs.node().querySelector("clipPath");
        if(defs_sphere){ defs_sphere.remove(); }
        if(defs_clipPath){ defs_clipPath.remove(); }
        svg_layers.selectAll(".layer")
                .attr("clip-path", null);
    }
}

function change_projection(proj_name) {
    var new_proj_name = proj_name.split('()')[0].split('.')[1];

    let prev_rotate = proj.rotate();
    // Update global variables:
    proj = eval(proj_name);
    path = d3.geoPath().projection(proj).pointRadius(4);
    t = proj.translate();
    s = proj.scale();

    // // Reset the projection center input :
    // document.getElementById("form_projection_center").value = 0;
    // document.getElementById("proj_center_value_txt").value = 0;

    // Do the reprojection :
    proj.translate(t).scale(s).rotate(prev_rotate);
    svg_layers.selectAll(".layer").selectAll("path").attr("d", path);

    // Set specifics mouse events according to the projection :
    if(new_proj_name.indexOf('Orthographic') > -1){
        var current_params = proj.rotate(),
            rotation_param = d3.select("#rotation_params");

        rotation_param.append("div").attr("class", "options_ortho")
                .html(i18next.t("app_page.section5.projection_center_phi"))
                .insert("input")
                .attrs({type: "range", id: "form_projection_phi"})
                .attrs({value: current_params[1], min: -180, max: 180, step: 0.5})
                .on("input", function(){handle_proj_center_button([null, this.value, null])})

        rotation_param.append("div").attr("class", "options_ortho")
                .html(i18next.t("app_page.section5.projection_center_gamma"))
                .insert("input")
                .attrs({type: "range", id: "form_projection_gamma"})
                .attrs({value: current_params[2], min: -90, max: 90, step: 0.5})
                .on("input", function(){handle_proj_center_button([null, null, this.value])});
    } else {
        d3.selectAll(".options_ortho").remove();
    }

    // map.select("svg").on("mousedown", null)
    //                 .on("mousemove", null)
    //                 .on("mouseup", null);

    // Reset the scale of the projection and the center of the view :
    let layer_name = Object.getOwnPropertyNames(user_data)[0]
                || Object.getOwnPropertyNames(result_data)[0]
                || null;
    if(!layer_name){
        let layers = layers_node.getElementsByClassName("layer");
        layer_name = layers.length > 0 ? _app.id_to_layer.get(layers[layers.length - 1].id) : null;
    }
    if(layer_name){
        scale_to_lyr(layer_name);
        center_map(layer_name);
        zoom_without_redraw();
    }

    // Reproject
    reproj_symbol_layer();

    // Set or remove the clip-path according to the projection:
    handleClipPath(new_proj_name);
}


// Function to switch the visibility of a layer the open/closed eye button
function handle_active_layer(name){
    var fill_value, parent_div, selec, at_end;

    if(document.getElementById("info_features").className == "active"){
        displayInfoOnMove();
        at_end = true;
    }
    if(!name) {
        selec = this;
        parent_div = selec.parentElement;
        name = parent_div.parentElement.getAttribute("layer_name");
    } else {
        selec = document.querySelector("#sortable ." + _app.layer_to_id.get(name) + " .active_button");
        parent_div = selec.parentElement;
    }
    let func = function() { handle_active_layer(name); };
    if(selec.id == "eye_closed"){
        fill_value = 1;
        let eye_open = make_eye_button("open");
        eye_open.onclick = func;
        parent_div.replaceChild(eye_open, selec);
    } else {
        fill_value = 0;
        let eye_closed = make_eye_button("closed");
        eye_closed.onclick = func;
        parent_div.replaceChild(eye_closed, selec);
    }
    svg_layers.select("#"+_app.layer_to_id.get(name)).style("visibility", fill_value == 0 ? "hidden" : "initial");
    svg_layers.selectAll(".lgdf_" + _app.layer_to_id.get(name)).style("visibility", fill_value == 0 ? "hidden" : "initial");

    if(at_end){
        displayInfoOnMove();
    }
}

// Function to handle the title add and changes
function handle_title(txt){
    var title = svg_legend.select("#map_title").select("text");
    if(title.node()){
        title.text(txt);
    } else {
        svg_legend.append("g")
             .attrs({"class": "legend legend_feature title", "id": "map_title"})
             .style("cursor", "pointer")
          .insert("text")
             .attrs({x: w/2, y: h/12,
                     "alignment-baseline": "middle", "text-anchor": "middle"})
             .styles({"font-family": "Arial, Helvetica, sans-serif",
                      "font-size": "20px", position: "absolute", color: "black"})
             .text(txt)
             .on("contextmenu dblclick", () => {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                handle_title_properties();
              })
             .call(drag_elem_geo);
    }
}

function handle_title_properties(){
    var title = svg_legend.select("#map_title").select("text");
    if(!title.node() || title.text() == ""){
        swal({title: "",
              text: i18next.t("app_page.common.error_no_title"),
              type: "error",
              allowOutsideClick: true,
              allowEscapeKey: true
            }).then( () => { null; },
                      () => { null; });
        return;
    }
    var title_props = {
        size: title.style("font-size"),
        font_weight: title.style('font-weight'),
        font_style: title.style('font-style'),
        text_decoration: title.style('text-decoration'),
        color: title.style("fill"),
        position_x: title.attr("x"),
        position_x_pct: round_value(+title.attr("x") / w * 100, 1),
        position_y: title.attr("y"),
        position_y_pct: round_value(+title.attr("y") / h * 100, 1),
        font_family: title.style("font-family")
        };
    title_props.font_weight = (title_props.font_weight == "400" || title_props.font_weight == "") ? "" : "bold";

    // Properties on the title are changed in real-time by the user then it will be rollback to original properties if Cancel is clicked
    make_confirm_dialog2("mapTitleitleDialogBox", i18next.t("app_page.title_box.title"), {widthFitContent: true})
        .then(function(confirmed){
            if(!confirmed)
                title.attrs({x: title_props.position_x, y: title_props.position_y})
                    .styles({
                        "font-size": title_props.size, "fill": title_props.color,
                        "font-family": title_props.font_family, 'font-style': title_props.font_style,
                        'text-decoration': title_props.text_decoration, 'font-weight': title_props.font_weight
                        });
            });
    var box_content = d3.select(".mapTitleitleDialogBox").select(".modal-body").append("div").style("margin", "15x");

    box_content.append("p")
        .html(i18next.t("app_page.title_box.font_size"))
        .insert("input")
        .attrs({type: "number", min: 2, max:40, step:1, value: +title_props.size.split("px")[0]}).style("width", "65px")
        .on("change", function(){  title.style("font-size", this.value + "px");  });
    box_content.append("p")
        .html(i18next.t("app_page.title_box.xpos"))
        .insert("input")
        .attrs({type: "number", min: 0, max:100, step:1, value: title_props.position_x_pct}).style("width", "65px")
        .on("change", function(){  title.attr("x", w * +this.value / 100);  });
    box_content.append("p")
        .html(i18next.t("app_page.title_box.ypos"))
        .insert("input")
        .attrs({type: "number", min: 0, max:100, step:1, value: title_props.position_y_pct}).style("width", "65px")
        .on("change", function(){  title.attr("y", h * +this.value / 100);  });
    box_content.append("p").html(i18next.t("app_page.title_box.font_color"))
        .insert("input")
        .attrs({type: "color", value: rgb2hex(title_props.color)})
        .on("change", function(){  title.style("fill", this.value);  });
    var font_select = box_content.append("p").html(i18next.t("app_page.title_box.font_family"))
        .insert("select").attr("class", "params")
        .on("change", function(){  title.style("font-family", this.value); });
    available_fonts.forEach(function(font){
        font_select.append("option").text(font[0]).attr("value", font[1])
    });
    font_select.node().selectedIndex = available_fonts.map(d => d[1] == title_props.font_family ? "1" : "0").indexOf("1");
    // TODO : Allow the display a rectangle (resizable + selection color) under the title
    let options_format = box_content.append('p'),
        btn_bold = options_format.insert('span').attr('class', title_props.font_weight == "bold" ? 'active button_disc' : 'button_disc').html('<img title="Bold" src="data:image/gif;base64,R0lGODlhFgAWAID/AMDAwAAAACH5BAEAAAAALAAAAAAWABYAQAInhI+pa+H9mJy0LhdgtrxzDG5WGFVk6aXqyk6Y9kXvKKNuLbb6zgMFADs=">'),
        btn_italic = options_format.insert('span').attr('class', title_props.font_style == "italic" ? 'active button_disc' : 'button_disc').html('<img title="Italic" src="data:image/gif;base64,R0lGODlhFgAWAKEDAAAAAF9vj5WIbf///yH5BAEAAAMALAAAAAAWABYAAAIjnI+py+0Po5x0gXvruEKHrF2BB1YiCWgbMFIYpsbyTNd2UwAAOw==">'),
        btn_underline = options_format.insert('span').attr('class', title_props.text_decoration == "underline" ? 'active button_disc' : 'button_disc').html('<img title="Underline" src="data:image/gif;base64,R0lGODlhFgAWAKECAAAAAF9vj////////yH5BAEAAAIALAAAAAAWABYAAAIrlI+py+0Po5zUgAsEzvEeL4Ea15EiJJ5PSqJmuwKBEKgxVuXWtun+DwxCCgA7">');

    btn_bold.on('click', function(){
        if(this.classList.contains('active')){
            this.classList.remove('active');
            title.style('font-weight', '');
        } else {
            this.classList.add('active');
            title.style('font-weight', 'bold');
        }
    });
    btn_italic.on('click', function(){
        if(this.classList.contains('active')){
            this.classList.remove('active');
            title.style('font-style', '');
        } else {
            this.classList.add('active');
            title.style('font-style', 'italic');
        }
    });
    btn_underline.on('click', function(){
      if(this.classList.contains('active')){
          this.classList.remove('active');
          title.style('text-decoration', '');
      } else {
          this.classList.add('active');
          title.style('text-decoration', 'underline');
      }
  });
    return;
}

// Function to change (one of ) the three rotations axis of a d3 projection
// and redraw all the path in respect to that
function handle_proj_center_button(param){
    let current_rotation = proj.rotate();
    if(param[0]){
        proj.rotate([param[0], current_rotation[1], current_rotation[2]]);
        svg_layers.selectAll(".layer").selectAll("path").attr("d", path);
    }
    if(param[1]){
        proj.rotate([current_rotation[0], param[1] - h/2, current_rotation[2]]);
        svg_layers.selectAll(".layer").selectAll("path").attr("d", path);
    }
    if(param[2]){
        proj.rotate([current_rotation[0], current_rotation[1], param[2] - h/2]);
        svg_layers.selectAll(".layer").selectAll("path").attr("d", path);
    }
    reproj_symbol_layer();
}

/** Function triggered by the change of map/canvas size
* @param {Array} shape - An Array of two elements : [width, height] to use;
*                generally only used once at the time so `shape` values
*                are like [null, 750] or [800, null]
*                but also works with the 2 params together like [800, 750])
*/
function canvas_mod_size(shape){
    if(shape[0]){
        w = +shape[0];
        map.attr("width", w)
            .call(zoom_without_redraw);
        map_div.style("width", w + "px");
        if(w + 360 + 30 < window.innerWidth){
            document.querySelector(".light-menu").style.right = '-30px';
        } else {
            document.querySelector(".light-menu").style.right = '0px';
        }
    }
    if(shape[1]){
        h = +shape[1];
        map.attr("height", h)
            .call(zoom_without_redraw);
        map_div.style("height", h + "px");
    }
    move_legends();

    // Lets update the corresponding fields in the export section :
    let ratio,
        format = document.getElementById("select_png_format").value;
    if (format === "web"){
        ratio = 1
    } else if (format === "user_defined") {
        ratio = 118.11;
    } else {
        return;
    }
    document.getElementById("export_png_width").value = Math.round(w * ratio * 10) / 10;
    document.getElementById("export_png_height").value = Math.round(h * ratio * 10) / 10;
}

function patchSvgForFonts(){
    function getListUsedFonts(){
        let elems = [
            legend_node.getElementsByTagName('text'),
            legend_node.getElementsByTagName('p')
        ];
        let needed_definitions = [];
        elems.map(d => d ? d : []);
        for(let j=0; j < 2; j++){
            for(let i=0; i < elems[j].length; i++){
                let font_elem = elems[j][i].style.fontFamily;
                customs_fonts.forEach(font => {
                    if(font_elem.indexOf(font) > -1 && needed_definitions.indexOf(font) == -1){
                        needed_definitions.push(font);
                    }
                });
            }
        }
        return needed_definitions;
    }

    var needed_definitions = getListUsedFonts();
    if(needed_definitions.length == 0){
        return;
    } else {
        let fonts_definitions = Array.prototype.filter.call(
            document.styleSheets,
            i => i.href && i.href.indexOf("style-fonts.css") > -1 ? i : null
            )[0].cssRules;
        let fonts_to_add = needed_definitions.map(name => String(fonts_definitions[customs_fonts.indexOf(name)].cssText));
        let style_elem = document.createElement("style");
        style_elem.innerHTML = fonts_to_add.join(' ');
        defs.node().appendChild(style_elem);
    }
}

function unpatchSvgForFonts(){
    let defs_style = defs.node().querySelector("style");
    if(defs_style)
        defs_style.remove();
}

function patchSvgForInkscape(){
    svg_map.setAttribute("xmlns:inkscape", "http://www.inkscape.org/namespaces/inkscape");
    let elems = svg_map.getElementsByTagName("g");
    for(let i = elems.length - 1; i > -1; i--){
        if(elems[i].id == ""){
            continue;
        } else if (Array.prototype.indexOf.call(elems[i].classList, "layer") > -1) {
            elems[i].setAttribute("inkscape:label", elems[i].id);
        } else if(elems[i].id.indexOf("legend") > -1){
            let layer_name = elems[i].className.baseVal.split("lgdf_")[1];
            elems[i].setAttribute("inkscape:label", "legend_" + layer_name);
        } else {
            elems[i].setAttribute("inkscape:label", elems[i].id);
        }
        elems[i].setAttribute("inkscape:groupmode", "layer");
    }
}

function unpatchSvgForInkscape(){
    svg_map.removeAttribute("xmlns:inkscape");
    let elems = svg_map.getElementsByTagName("g");
    for(let i = elems.length - 1; i > -1; i--){
        if(elems[i].id == ""){
            continue;
        } else {
            elems[i].removeAttribute("inkscape:label");
            elems[i].removeAttribute("inkscape:groupmode");
        }
    }

}

function check_output_name(name, extension){
    let _part = name.split("."),
        regexp_name = new RegExp(/^[a-z0-9_]+$/i);
    if(regexp_name.test(_part[0]) && _part[0].length < 250){
        return _part[0] + "." + extension;
    } else {
        return "export." + extension;
    }
}

function patchSvgForForeignObj(){
    let elems = document.getElementsByTagName("foreignObject");
    let originals = [];
    for(let i = 0; i < elems.length; i++){
        let el = elems[i];
        originals.push([el.getAttribute('width'), el.getAttribute('height')]);
        el.setAttribute('width', '100%');
        el.setAttribute('height', '100%')
    }
    return originals;
}

function unpatchSvgForForeignObj(originals){
    let elems = document.getElementsByTagName("foreignObject");
    for(let i = 0; i < originals.length; i++){
        let el = elems[i];
        el.setAttribute('width', originals[i][0]);
        el.setAttribute('height', originals[i][1]);
    }
}


function export_compo_svg(output_name){
    output_name = check_output_name(output_name, "svg");
    patchSvgForInkscape();
    patchSvgForFonts();
    let dimensions_foreign_obj = patchSvgForForeignObj();
    let targetSvg = document.getElementById("svg_map"),
        serializer = new XMLSerializer(),
        source = serializer.serializeToString(targetSvg);

    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = ['<?xml version="1.0" standalone="no"?>\r\n', source].join('');

    let url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
    clickLinkFromDataUrl(url, output_name).then(a => {
        unpatchSvgForFonts();
        unpatchSvgForForeignObj(dimensions_foreign_obj);
        unpatchSvgForInkscape();
    });
}

// Maybe PNGs should be rendered on server side in order to avoid limitations that
//   could be encountered in the browser (as "out of memory" error)
function _export_compo_png(type="web", scalefactor=1, output_name){
    document.getElementById("overlay").style.display = "";
    output_name = check_output_name(output_name, "png");
    let dimensions_foreign_obj = patchSvgForForeignObj();
    patchSvgForFonts();
    var targetCanvas = d3.select("body").append("canvas").attrs({id: "canvas_map_export", height: h, width: w}).node(),
        targetSVG = document.getElementById("svg_map"),
        mime_type = "image/png",
        svg_xml,
        ctx,
        img;

    // At this point it might be better to wrap the whole function in a try catch ?
    // (as it seems it could fail on various points (XMLSerializer()).serializeToString, toDataURL, changeResolution, etc.)
    try {
        svg_xml = (new XMLSerializer()).serializeToString(targetSVG),
        ctx = targetCanvas.getContext('2d'),
        img = new Image();
    } catch(err) {
        document.getElementById("overlay").style.display = "none";
        display_error_during_computation(String(err));
        return;
    }
    if(scalefactor != 1){
        try {
            changeResolution(targetCanvas, scalefactor);
        } catch (err) {
            document.getElementById("overlay").style.display = "none";
            display_error_during_computation(i18next.t('app_page.common.error_too_high_resolution') + ' ' + String(err));
            return;
        }
    }
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg_xml);
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        try {
            var imgUrl = targetCanvas.toDataURL(mime_type);
        } catch (err) {
            document.getElementById("overlay").style.display = "none";
            display_error_during_computation(String(err));
            return;
        }
        clickLinkFromDataUrl(imgUrl, output_name)
            .then(_ => {
                unpatchSvgForFonts();
                unpatchSvgForForeignObj(dimensions_foreign_obj);
                document.getElementById("overlay").style.display = "none";
            });
    }
}

function export_layer_geo(layer, type, projec, proj4str){
    let formToSend = new FormData();
    formToSend.append("layer", layer);
    formToSend.append("layer_name", current_layers[layer].key_name);
    formToSend.append("format", type);
    if(projec == "proj4string")
        formToSend.append("projection", JSON.stringify({"proj4string" : proj4str}));
    else
        formToSend.append("projection", JSON.stringify({"name" : projec}));

    let extensions = new Map([
        ["GeoJSON", "geojson"],
        ["TopoJSON", "topojson"],
        ["ESRI Shapefile", "zip"],
        ["GML", "zip"],
        ["KML", "kml"]]);

    xhrequest("POST", '/get_layer2', formToSend, true)
        .then( data => {
            if(data.indexOf('{"Error"') == 0 || data.length == 0){
                let error_message;
                if(data.indexOf('{"Error"') < 5){
                    data = JSON.parse(data);
                    error_message = i18next.t(data.Error);
                } else {
                    error_message = i18next.t('app_page.common.error_msg');
                }
                swal({title: "Oops...",
                     text: error_message,
                     type: "error",
                     allowOutsideClick: false,
                     allowEscapeKey: false
                    }).then( () => { null; },
                              () => { null; });
                return;
            }
            let ext = extensions.get(type),
                filename = [layer, ext].join('.'),
                dataStr;
            if(ext.indexOf("json") > -1){
                dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
            } else if (ext.indexOf("kml") > -1) {
                dataStr = "data:text/xml;charset=utf-8," + encodeURIComponent(data);
            } else {
                dataStr = "data:application/zip;base64," + data;
            }
            clickLinkFromDataUrl(dataStr, filename);
        }, error => {
            console.log(error);
        });
}

/*
* Straight from http://stackoverflow.com/a/26047748/5050917
*
*/
function changeResolution(canvas, scaleFactor) {
    // Set up CSS size if it's not set up already
    if (!canvas.style.width)
        canvas.style.width = canvas.width + 'px';
    if (!canvas.style.height)
        canvas.style.height = canvas.height + 'px';

    canvas.width = Math.ceil(canvas.width * scaleFactor);
    canvas.height = Math.ceil(canvas.height * scaleFactor);
    var ctx = canvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);
}

function fill_export_png_options(displayed_ratio){
    let select_size_png = d3.select("#select_png_format");
    select_size_png.selectAll("option").remove();

    select_size_png.append("option").attrs({value: "web", class: "i18n", "data-i18n": "[text]app_page.section5b.web"});
    select_size_png.append("option").attrs({value: "user_defined", class: "i18n", "data-i18n": "[text]app_page.section5b.user_defined"});

    if(displayed_ratio == "portrait"){
        select_size_png.append("option").attrs({value: "A5_portrait", class: "i18n", "data-i18n": "[text]app_page.section5b.A5_portrait"});
        select_size_png.append("option").attrs({value: "A4_portrait", class: "i18n", "data-i18n": "[text]app_page.section5b.A4_portrait"});
        select_size_png.append("option").attrs({value: "A3_portrait", class: "i18n", "data-i18n": "[text]app_page.section5b.A3_portrait"});

    } else if (displayed_ratio == "landscape") {
        select_size_png.append("option").attrs({value: "A5_landscape", class: "i18n", "data-i18n": "[text]app_page.section5b.A5_landscape"});
        select_size_png.append("option").attrs({value: "A4_landscape", class: "i18n", "data-i18n": "[text]app_page.section5b.A4_landscape"});
        select_size_png.append("option").attrs({value: "A3_landscape", class: "i18n", "data-i18n": "[text]app_page.section5b.A3_landscape"});
    }
    localize("#select_png_format > .i18n");
}

let beforeUnloadWindow = (event) => {
    get_map_template().then(function(json_params){
        window.localStorage.removeItem("magrit_project");
        window.localStorage.setItem("magrit_project", json_params);
    });
    event.returnValue = (_app.targeted_layer_added || Object.getOwnPropertyNames(result_data).length > 0)
                        ? "Confirm exit" : undefined;
};
