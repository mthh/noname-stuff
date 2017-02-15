"use strict";

function getBreaks(values, type, nb_class){
    var _values = values.filter(v => v),
        no_data = values.length - _values.length,
        serie = new geostats(_values),
        nb_class = +nb_class || getOptNbClass(_values.length),
        breaks = [];
    if(type === "Q6"){
        let tmp = getBreaksQ6(serie.sorted(), serie.precision);
        breaks = tmp.breaks;
        breaks[0] = serie.min();
        breaks[nb_class] = serie.max();
        serie.setClassManually(breaks);
    } else {
        let _func = discretiz_geostats_switch.get(type);
        breaks = serie[_func](nb_class);
        if(serie.precision) breaks = breaks.map(val => round_value(val, serie.precision));
    }
    return [serie, breaks, nb_class, no_data];
}

function discretize_to_size(values, type, nb_class, min_size, max_size){
    var [serie, breaks, nb_class] = getBreaks(values, type, nb_class);
    var step = (max_size - min_size) / (nb_class - 1),
        class_size = Array(nb_class).fill(0).map((d,i) => min_size + (i * step)),
        breaks_prop = [];

    for(let i = 0; i<breaks.length-1; ++i)
        breaks_prop.push([[breaks[i], breaks[i+1]], class_size[i]]);
    return [nb_class, type, breaks_prop, serie];
}

var discretize_to_colors = (function discretize_to_colors(values, type, nb_class, col_ramp_name){
    col_ramp_name = col_ramp_name || "Reds";
    var [serie, breaks, nb_class, nb_no_data] = getBreaks(values, type, nb_class),
        color_array = getColorBrewerArray(nb_class, col_ramp_name),
        no_data_color = nb_no_data > 0 ? '#e7e7e7' : null,
        colors_map = [];
    for(let j=0; j<values.length; ++j){
        if(values[j] != null && values[j] != ""){
          let idx = serie.getClass(values[j]);
          colors_map.push(color_array[idx]);
        } else {
          colors_map.push(no_data_color);
        }
    }
    return [nb_class, type, breaks, color_array, colors_map, no_data_color];
}).memoize();

// Todo: let the user choose if he wants a regular histogram or a "beeswarm" plot ?
var display_discretization = function(layer_name, field_name, nb_class, options){
    var make_no_data_section = function(){
        var section = d3.select("#color_div")
                .append("div").attr("id", "no_data_section")
                .append("p")
                .html(i18next.t("disc_box.withnodata", {count: +no_data}));

        section.append("input")
                .attrs({type: "color", value: "#ebebcd", id: "no_data_color"})
                .style("margin", "0px 10px");
    };

    var make_sequ_button = function(){
        var col_div = d3.select("#color_div");
        col_div.selectAll('.color_params').remove();
        col_div.selectAll('.color_txt').remove();
        col_div.selectAll('.color_txt2').remove();
        col_div.selectAll('.central_class').remove();
        col_div.selectAll('.central_color').remove();
        col_div.selectAll('#reverse_pal_btn').remove();
        var sequential_color_select = col_div.insert("p")
            .attr("class", "color_txt")
            .style("margin-left", "10px")
            .html(i18next.t("disc_box.color_palette"))
            .insert("select")
            .attr("class", "color_params")
            .styles({'background-image': 'url(/static/img/palettes/Blues.png)', 'width': '116px'})
            .on("change", function(){
                this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)'
                redisplay.draw();
              });

        ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd',
         'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
         'Greens', 'Greys', 'Oranges', 'Purples',
         'Reds'].forEach(function(name){
            sequential_color_select.append("option")
                .text(name)
                .attrs({value: name, title: name})
                .styles({'background-image': 'url(/static/img/palettes/' + name + '.png)'});
        });
        var button_reverse = d3.select(".color_txt").insert('p').style('text-align', 'center')
                                .insert("button")
                                .styles({"margin-top": "10px"})
                                .attrs({"class": "button_st3", "id": "reverse_pal_btn"})
                                .html(i18next.t("disc_box.reverse_palette"))
                                .on("click", function(){
                                    to_reverse = true;
                                    redisplay.draw();
                                });
    };

    var make_diverg_button = function(){
        var col_div = d3.select("#color_div");
        col_div.selectAll('.color_params').remove();
        col_div.selectAll('.color_txt').remove();
        col_div.selectAll('.color_txt2').remove();
        col_div.selectAll('#reverse_pal_btn').remove();
        col_div.insert('p')
                .attr("class", "central_class")
                .html(i18next.t("disc_box.break_on"))
               .insert("input").attrs({
                   type: "number", class: "central_class", id: "centr_class",
                   min: 1, max: nb_class-1, step: 1, value: Math.round(nb_class / 2)
                   }).style("width", "40px")
               .on("change", function(){redisplay.draw();});

        var pal_names = ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd',
                         'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
                         'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'];
        var left_color_select = col_div.insert("p")
                        .attr("class", "color_txt")
                        .style("display", "inline")
                        .html(i18next.t("disc_box.left_colramp"))
                        .insert("select")
                        .style('width', '116px')
                        .attr("class", "color_params_left")
                        .on("change", function(){
                            this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)'
                            redisplay.draw();
                        });
        var right_color_select = col_div.insert("p")
                        .styles({display: "inline", "margin-left": "70px"})
                        .attr("class", "color_txt2")
                        .html(i18next.t("disc_box.right_colramp"))
                        .insert("select")
                        .style('width', '116px')
                        .attr("class", "color_params_right")
                        .on("change", function(){
                            this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)'
                            redisplay.draw();
                        });
        pal_names.forEach(function(name){
            left_color_select.append("option").text(name).attrs({value: name, title: name}).styles({'background-image': 'url(/static/img/palettes/' + name + '.png)'});
            right_color_select.append("option").text(name).attrs({value: name, title: name}).styles({'background-image': 'url(/static/img/palettes/' + name + '.png)'});
        });
        document.getElementsByClassName("color_params_right")[0].selectedIndex = 14;

        let central_color = col_div.insert('p').attr("class", "central_color");
        central_color.insert("input")
                    .attrs({"type": "checkbox", "id": "central_color_chkbx"})
                    .on("change", function(){
                      redisplay.draw();
                      if(this.checked)
                        col_div.select("#central_color_val").style("display", "");
                    });
        central_color.select("input").node().checked = true;
        central_color.insert("label")
            .attr("for", "central_color_chkbx")
            .html(i18next.t("disc_box.colored_central_class"));
        central_color.insert("input")
            .attrs({type: "color", id: "central_color_val", value: "#e5e5e5"})
            .styles({"margin": "0px 10px", "display": "none"})
            .on("change", redisplay.draw);
    };

    var make_box_histo_option = function(){

        var histo_options = newBox.append('div')
            .attrs({id: 'histo_options', class: 'row equal'})
            .styles({'margin': '5px 5px 10px 15px', 'width': '100%'});
        var a = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
            b = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
            c = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
            d = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3');

        a.insert('button')
            .attrs({class: 'btn_population'})
            .html(i18next.t('disc_box.disp_rug_pop'))
            .on('click', function(){
                if(this.classList.contains('active')){
                  this.classList.remove('active');
                  rug_plot.style('display', 'none');
                  rug_plot.classed('active', false);
                } else {
                  this.classList.add('active');
                  rug_plot.style('display', '');
                  rug_plot.classed('active', true);
                }
            });

        b.insert('button')
            .attrs({class: 'btn_mean'})
            .html(i18next.t('disc_box.disp_mean'))
            .on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    line_mean.style("stroke-width", 0);
                    txt_mean.style("fill", "none");
                    line_mean.classed("active", false);
                } else {
                    this.classList.add('active');
                    line_mean.style("stroke-width", 2);
                    txt_mean.style("fill", "blue");
                    line_mean.classed("active", true);
                }
            });

        c.insert('button')
            .attrs({class: 'btn_median'})
            .html(i18next.t('disc_box.disp_median'))
            .on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    line_median.style('stroke-width', 0)
                                .classed('active', false);
                    txt_median.style('fill', 'none');
                } else {
                    this.classList.add('active');
                    line_median.style('stroke-width', 2)
                                .classed('active', true);
                    txt_median.style('fill', 'darkgreen');
                }
            });

        d.insert('button')
            .attrs({class: 'btn_stddev'})
            .html(i18next.t('disc_box.disp_sd'))
            .on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    line_std_left.style("stroke-width", 0)
                    line_std_left.classed("active", false)
                    line_std_right.style("stroke-width", 0)
                    line_std_right.classed("active", false)
                } else {
                    this.classList.add('active');
                    line_std_left.style("stroke-width", 2)
                    line_std_left.classed("active", true)
                    line_std_right.style("stroke-width", 2)
                    line_std_right.classed("active", true)
                }
            });
    }

    var make_overlay_elements = function(){

      let mean_val = serie.mean(),
          stddev = serie.stddev();

      line_mean = overlay_svg.append("line")
          .attr("class", "line_mean")
          .attr("x1", x(mean_val))
          .attr("y1", 10)
          .attr("x2", x(mean_val))
          .attr("y2", svg_h - margin.bottom)
          .styles({"stroke-width": 0, stroke: "blue", fill: "none"})
          .classed("active", false);

      txt_mean = overlay_svg.append("text")
          .attr("y", 0)
          .attr("dy", "0.75em")
          .attr("x", x(mean_val))
          .style("fill", "none")
          .attr("text-anchor", "middle")
          .text(i18next.t("disc_box.mean"));

      line_median = overlay_svg.append("line")
          .attr("class", "line_med")
          .attr("x1", x(serie.median()))
          .attr("y1", 10)
          .attr("x2", x(serie.median()))
          .attr("y2", svg_h - margin.bottom)
          .styles({"stroke-width": 0, stroke: "darkgreen", fill: "none"})
          .classed("active", false);

      txt_median = overlay_svg.append("text")
          .attr("y", 0)
          .attr("dy", "0.75em")
          .attr("x", x(serie.median()))
          .style("fill", "none")
          .attr("text-anchor", "middle")
          .text(i18next.t("disc_box.median"));

      line_std_left = overlay_svg.append("line")
          .attr("class", "lines_std")
          .attr("x1", x(mean_val - stddev))
          .attr("y1", 10)
          .attr("x2", x(mean_val - stddev))
          .attr("y2", svg_h - margin.bottom)
          .styles({"stroke-width": 0, stroke: "grey", fill: "none"})
          .classed("active", false);

      line_std_right = overlay_svg.append("line")
          .attr("class", "lines_std")
          .attr("x1", x(mean_val + stddev))
          .attr("y1", 10)
          .attr("x2", x(mean_val + stddev))
          .attr("y2", svg_h - margin.bottom)
          .styles({"stroke-width": 0, stroke: "grey", fill: "none"})
          .classed("active", false);


      rug_plot = overlay_svg.append('g')
          .style('display', 'none');
      rug_plot.selectAll('.indiv')
          .data(values.map(i => ({value: +i})))
          .enter()
          .insert('line')
          .attrs(d => ({class: 'indiv', x1: x(d.value), y1: svg_h - margin.bottom - 10, x2: x(d.value), y2: svg_h - margin.bottom}))
          .styles({'stroke': 'red', 'fill': 'none', 'stroke-width': 1});
    }

    var make_summary = function(){
        let content_summary = make_content_summary(serie);
        newBox.append("div").attr("id", "summary")
            .styles({'font-size': '11px', 'float': 'right', 'margin': '10px 10px 0px 10px'})
            .insert("p")
            .html(["<b>", i18next.t("disc_box.summary"), "</b><br>", content_summary].join(""));
    }

    var redisplay = {
        compute: function(){
            serie = new geostats(values);
            breaks = [];
            values = serie.sorted();

            if(type === "Q6"){
                var tmp = getBreaksQ6(values, serie.precision);
                console.log(values); console.log(tmp)
                stock_class = tmp.stock_class;
                breaks = tmp.breaks;
                breaks[0] = serie.min();
                breaks[6] = serie.max();
                serie.setClassManually(breaks);
            } else if (type === "user_defined") {
                var tmp = getBreaks_userDefined(serie.sorted(), user_break_list);
                stock_class = tmp.stock_class;
                breaks = tmp.breaks;
                serie.setClassManually(breaks);
            } else {
                let _func = discretiz_geostats_switch.get(type);
                breaks = serie[_func](nb_class);
                // if(serie.precision) breaks = breaks.map(val => round_value(val, serie.precision));
                serie.doCount();
                stock_class = Array.prototype.slice.call(serie.counter);
                if(stock_class.length == 0){
                    return;
                }
            }
            // In order to avoid class limit falling out the serie limits with Std class :
//            breaks[0] = breaks[0] < serie.min() ? serie.min() : breaks[0];
//            ^^^ well finally not ?
            bins = [];
            for(let i = 0, len = stock_class.length, offset=0; i < len; i++){
                let bin = {};
                bin.val = stock_class[i];
                bin.offset = i == 0 ? 0 : (bins[i-1].width + bins[i-1].offset);
                bin.width = breaks[i+1] - breaks[i];
                bin.height = bin.val / (breaks[i+1] - breaks[i]);
                bins[i] = bin;
            }
            return true;
        },
        draw: function(provided_colors){
            // Clean-up previously made histogram :
            newBox.select("#svg_discretization").selectAll(".bar").remove();
            newBox.select("#svg_discretization").selectAll(".text_bar").remove();

            if(!provided_colors){
                var col_scheme = newBox.select('.color_params_left').node() ? "diverging" : "sequential";
                if(col_scheme === "sequential"){
                    if(to_reverse){
                        color_array = color_array.reverse();
                        to_reverse = false;
                    } else {
                        var selected_palette = document.querySelector('.color_params').value;
                        color_array = getColorBrewerArray(nb_class, selected_palette);
                        color_array = color_array.slice(0, nb_class);
                    }
                } else if(col_scheme === "diverging"){
                    var left_palette = document.querySelector('.color_params_left').value,
                        right_palette = document.querySelector('.color_params_right').value,
                        ctl_class_value = +document.getElementById('centr_class').value,
                        ctl_class_color =  document.querySelector(".central_color > input").checked
                                        ? document.getElementById("central_color_val").value
                                        : [];

                    let class_right = nb_class - ctl_class_value + 1,
                        class_left = ctl_class_value - 1,
                        max_col_nb = Math.max(class_right, class_left),
                        right_pal = getColorBrewerArray(max_col_nb, right_palette),
                        left_pal = getColorBrewerArray(max_col_nb, left_palette);

                    left_pal = left_pal.slice(0, class_left).reverse();
                    right_pal = right_pal.slice(0, class_right);

                    color_array = [].concat(left_pal, ctl_class_color, right_pal);
                }
            } else {
                color_array = provided_colors.slice();
            }
            for(let i=0, len = bins.length; i<len; ++i)
                bins[i].color = color_array[i];

            var x = d3.scaleLinear()
                        .domain([serie.min(), serie.max()])
                        .range([0, svg_w]);

            var y = d3.scaleLinear()
                .range([svg_h, 0]);

            x.domain([0, d3.max(bins.map(d => d.offset + d.width))]);
            y.domain([0, d3.max(bins.map(d => d.height + (d.height / 5)))]);

            var bar = svg_histo.selectAll(".bar")
                .data(bins)
              .enter()
                .append("rect")
                .attrs( (d,i) => ({
                  "class": "bar", "id": "bar_" + i, "transform": "translate(0, -7.5)",
                  "x": x(d.offset), "y": y(d.height) - margin.bottom,
                  "width": x(d.width), "height": svg_h - y(d.height)
                }))
                .styles(d => ({
                  "opacity": 0.95,
                  "stroke-opacity": 1,
                  "fill": d.color
                }))
                .on("mouseover", function(){
                    this.parentElement.querySelector("#text_bar_" + this.id.split('_')[1]).style.display = null;
                })
                .on("mouseout", function(){
                    this.parentElement.querySelector("#text_bar_" + this.id.split('_')[1]).style.display = "none";
                });

            svg_histo.selectAll(".txt_bar")
                .data(bins)
              .enter().append("text")
                .attrs( (d,i) => ({
                  "id": "text_bar_" + i, "class": "text_bar", "text-anchor": "middle",
                  "dy": ".75em", "x": x(d.offset + d.width / 2), "y": y(d.height) - margin.top * 2 - margin.bottom - 1.5
                }))
                .styles({"color": "black", "cursor": "default", "display": "none"})
                .text(d => formatCount(d.val));

            document.getElementById("user_breaks_area").value = breaks.join(' - ')
            return true;
        },
    };

    //////////////////////////////////////////////////////////////////////////

    var modal_box = make_dialog_container(
         "discretiz_charts",
         [i18next.t("disc_box.title"), " - ", layer_name, " - ", field_name].join(''),
         "discretiz_charts_dialog"
        );

    var newBox = d3.select("#discretiz_charts").select(".modal-body");

    if(result_data.hasOwnProperty(layer_name)) var db_data = result_data[layer_name];
    else if(user_data.hasOwnProperty(layer_name)) var db_data = user_data[layer_name];
    else {
      let layer = svg_map.querySelector('#' + _app.idLayer.get(layer_name));
      var db_data = Array.prototype.map.call(layer.children, d => d.__data__.properties);
    }
    var color_array = [],
        nb_values = db_data.length,
        indexes = [],
        values = [],
        no_data;

    var type = options.type;

    for(let i=0; i<nb_values; i++){
        if(db_data[i][field_name] != null && db_data[i][field_name] != ""){
            values.push(+db_data[i][field_name]);
            indexes.push(i);
        }
    }

    if(nb_values == values.length){
        no_data = 0;
    } else {
        no_data = nb_values - values.length;
        nb_values = values.length;
    }

    var serie = new geostats(values),
        breaks = [], stock_class = [],
        bins = [], user_break_list = null,
        max_nb_class = 20 < nb_values ? 20 : nb_values;

    if(serie.variance() == 0 && serie.stddev() == 0){
        var serie = new geostats(values);
    }

    values = serie.sorted();
    var available_functions = [
     [i18next.t("app_page.common.equal_interval"), "equal_interval"],
     [i18next.t("app_page.common.quantiles"), "quantiles"],
//     [i18next.t("app_page.common.std_dev"), "std_dev"],
     [i18next.t("app_page.common.Q6"), "Q6"],
     [i18next.t("app_page.common.arithmetic_progression"), "arithmetic_progression"],
     [i18next.t("app_page.common.jenks"), "jenks"]
    ];

    if(!serie._hasZeroValue() && !serie._hasNegativeValue()){
        available_functions.push([i18next.t("app_page.common.geometric_progression"), "geometric_progression"]);
    }
    let precision_axis = get_precision_axis(serie.min(), serie.max(), serie.precision);
    var formatCount = d3.format(precision_axis);
    var discretization = newBox.append('div')
        .attr("id", "discretization_panel")
        .insert("p")
        .insert("select").attr("class", "params")
        .on("change", function(){
            type = this.value;
            if(type === "Q6"){
                nb_class = 6;
                txt_nb_class.node().value = 6;
                document.getElementById("nb_class_range").value = 6;
            }
            redisplay.compute();
            redisplay.draw();
            });

    available_functions.forEach( func => {
        discretization.append("option").text(func[0]).attr("value", func[1]);
    });

    var txt_nb_class = d3.select("#discretization_panel").append("input")
        .attrs({type: "number", class: "without_spinner", min: 2, max: max_nb_class, value: nb_class, step: 1})
        .styles({width: "30px", "margin": "0 10px", "vertical-align": "calc(20%)"})
        .on("change", function(){
            let a = disc_nb_class.node();
            a.value = this.value;
            a.dispatchEvent(new Event('change'));
        });

    d3.select("#discretization_panel")
        .append('span')
        .html(i18next.t("disc_box.class"));

    var disc_nb_class = d3.select("#discretization_panel")
        .insert("input")
        .styles({display: "inline", width: "60px", "vertical-align": "middle", margin: "10px"})
        .attrs({id: "nb_class_range", type: "range"})
        .attrs({min: 2, max: max_nb_class, value: nb_class, step:1})
        .on("change", function(){
            type = discretization.node().value;
            var old_nb_class = nb_class;
            if(type === "Q6"){
                this.value = 6;
                txt_nb_class.node().value = 6;
                return;
            }
            nb_class = +this.value;
            txt_nb_class.node().value = nb_class;
            var ret_val = redisplay.compute();
            if(!ret_val){
                this.value = old_nb_class;
                txt_nb_class.node().value = +old_nb_class;
            } else {
                redisplay.draw();
                var ctl_class = document.getElementById("centr_class");
                if(ctl_class){
                    ctl_class.max = nb_class;
                    if(ctl_class > nb_class) ctl_class.value = Math.round(nb_class / 2);
                }
            }
        });

    var ref_histo_box = newBox.append('div').attr("id", "ref_histo_box");
    ref_histo_box.append('div').attr('id', 'inner_ref_histo_box');

    discretization.node().value = type;
    make_summary();
    var refDisplay = prepare_ref_histo(newBox, serie, formatCount);
    refDisplay("histogram");

    var svg_h = h / 5 > 100 ? h / 5 : 100,
        svg_w = 760 < (window.innerWidth - 40) ? 760 : (window.innerWidth - 40),
        margin = {top: 7.5, right: 30, bottom: 7.5, left: 30},
        height = svg_h - margin.top - margin.bottom;

    d3.select("#discretiz_charts").select(".modal-dialog")
        .styles({width: svg_w + margin.top + margin.bottom + 90 + "px",
                 height: window.innerHeight - 60 + "px"});

    if(values.length < 500){ // Only allow for beeswarm plot if there isn't too many values
        // as it seems to be costly due to the "simulation" + the voronoi
        let current_histo = "histogram",
            choice_histo = ref_histo_box.append('p').style('text-align', 'center');
        choice_histo.insert('button')
            .attrs({id: 'button_switch_plot', class: 'i18n button_st4', 'data-i18n': '[text]disc_box.switch_ref_histo'})
            .styles({padding: '3px', 'font-size': '10px'})
            .html(i18next.t('disc_box.switch_ref_histo'))
            .on('click', () => {
                let str_tr;
                if(current_histo == 'histogram'){
                    refDisplay("box_plot");
                    current_histo = "box_plot";
                    str_tr = "_boxplot";
                } else if (current_histo == "box_plot"){
                    refDisplay("beeswarm");
                    current_histo = "beeswarm";
                    str_tr = '_beeswarm';
               } else if (current_histo == "beeswarm"){
                     refDisplay("histogram");
                     current_histo = "histogram";
                     str_tr = '';
               }
               document.getElementById('ref_histo_title').innerHTML = '<b>' + i18next.t('disc_box.hist_ref_title' + str_tr) + '</b>';
            });
    }
    var div_svg = newBox.append('div')
        .append("svg").attr("id", "svg_discretization")
        .attr("width", svg_w + margin.left + margin.right)
        .attr("height", svg_h + margin.top + margin.bottom);

    make_box_histo_option();

    var svg_histo = div_svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
        .domain([serie.min(), serie.max()])
        .range([0, svg_w]);

    var overlay_svg = div_svg.append("g").attr('transform', 'translate(30, 0)'),
        line_mean, line_std_right, line_std_left, line_median, txt_median, txt_mean, rug_plot;

    make_overlay_elements();

    // As the x axis and the mean didn't change, they can be drawn only once :
    svg_histo.append("g")
        .attr("class", "x_axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom()
        .scale(x)
        .tickFormat(formatCount));

    var b_accordion_colors = newBox.append("button")
                        .attrs({"class": "accordion_disc active", "id": "btn_acc_disc_color"})
                        .style("padding", "0 6px")
                        .html(i18next.t("disc_box.title_color_scheme")),
        accordion_colors = newBox.append("div")
                        .attrs({"class": "panel show", "id": "accordion_colors"})
                        .style("width", "98%"),
        color_scheme =  d3.select("#accordion_colors")
                        .append("div")
                        .attr("id", "color_div")
                        .style("text-align", "center");

    [[i18next.t("disc_box.sequential"), "sequential"],
     [i18next.t("disc_box.diverging"), "diverging"]].forEach( el => {
        color_scheme.insert("label").style("margin", "20px").html(el[0])
                    .insert('input')
                    .attrs({type: "radio", name: "color_scheme", value: el[1], id: "button_"+el[1]})
                     .on("change", function(){
                        this.value === "sequential" ? make_sequ_button()
                                                    : make_diverg_button();
                        redisplay.draw();
                      });
    });
    var to_reverse = false;
    document.getElementById("button_sequential").checked = true;

    var b_accordion_breaks = newBox.append("button")
                        .attrs({"class": "accordion_disc", "id": "btn_acc_disc_break"})
                        .style("padding", "0 6px")
                        .html(i18next.t("disc_box.title_break_values")),
        accordion_breaks = newBox.append("div")
                        .attrs({"class": "panel", "id": "accordion_breaks_vals"})
                        .style("width", "98%");

    var user_defined_breaks =  accordion_breaks.append("div").attr("id","user_breaks");

    user_defined_breaks.insert("textarea")
                        .attr("id","user_breaks_area")
                        .attr("placeholder", i18next.t("app_page.common.expected_class"))
                        .style("width", "600px");

    user_defined_breaks
        .insert("button")
        .text(i18next.t("app_page.common.valid"))
        .on("click", function(){
            let old_nb_class = nb_class;
            user_break_list = document.getElementById("user_breaks_area").value;
            type = "user_defined";
            nb_class = user_break_list.split('-').length - 1;
            txt_nb_class.node().value = +nb_class;
            // txt_nb_class.html(i18next.t("disc_box.class", {count: +nb_class}));
            document.getElementById("nb_class_range").value = nb_class;
            redisplay.compute();
            redisplay.draw();
         });

    accordionize(".accordion_disc", d3.select("#discretiz_charts").node());

    if(no_data > 0){
        make_no_data_section();
        if(options.no_data){
            document.getElementById("no_data_color").value = options.no_data;
        }
    }

    if(!options.schema){
        make_sequ_button();
    } else if(options.schema.length == 1){
        make_sequ_button();
        document.querySelector(".color_params").value = options.schema[0];
    } else if(options.schema.length > 1){
        make_diverg_button();
        document.getElementById("button_diverging").checked = true;
        let tmp = 0;
        setSelected(document.querySelector(".color_params_left"), options.schema[0]);
        // document.querySelector(".color_params_left").value = options.schema[0];
        if(options.schema.length > 2){
            setSelected(document.querySelector(".central_color_val"), options.schema[1]);
            // document.getElementById("central_color_val").value = options.schema[1];
            tmp = 1;
            document.querySelector(".central_color").querySelector("input").checked = true;
        } else {
            document.querySelector(".central_color").querySelector("input").checked = false;
        }
        setSelected(document.querySelector(".color_params_right"), options.schema[1 + tmp]);
        // document.querySelector(".color_params_right").value = options.schema[1 + tmp];
    }

    if(options.type && options.type == "user_defined"){
        user_break_list = options.breaks;
    }

    redisplay.compute();
    redisplay.draw(options.colors);

    let deferred = Q.defer(),
        container = document.getElementById("discretiz_charts");

    container.querySelector(".btn_ok").onclick = function(){
        breaks = breaks.map(i => +i);
        var colors_map = [];
        let no_data_color = null;
        if(no_data > 0){
            no_data_color = document.getElementById("no_data_color").value;
        }
        for(let j=0; j < db_data.length; ++j){
            let value = db_data[j][field_name];
            if(value !== null && isFinite(value) && value != ""){
                let idx = serie.getClass(+value);
                colors_map.push(color_array[idx]);
            } else {

                colors_map.push(no_data_color);
            }
        }
        let col_schema = [];
        if(!d3.select('.color_params_left').node()){
            col_schema.push(document.querySelector(".color_params").value);
        } else {
            col_schema.push(document.querySelector(".color_params_left").value);
            if(document.querySelector(".central_color").querySelector("input").checked){
                col_schema.push(document.getElementById("central_color_val").value);
            }
            col_schema.push(document.querySelector(".color_params_right").value);
        }
        deferred.resolve(
            [nb_class, type, breaks, color_array, colors_map, col_schema, no_data_color]);
        document.removeEventListener('keydown', helper_esc_key_twbs);
        modal_box.close();
        container.remove();
        let p = reOpenParent();
        if(!p) overlay_under_modal.hide();
    }

    let _onclose = () => {
        deferred.resolve(false);
        document.removeEventListener('keydown', helper_esc_key_twbs);
        modal_box.close();
        container.remove();
        let p = reOpenParent();
        if(!p) overlay_under_modal.hide();
    };
    container.querySelector(".btn_cancel").onclick = _onclose;
    container.querySelector("#xclose").onclick = _onclose;
    function helper_esc_key_twbs(evt){
          evt = evt || window.event;
          let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
          if (isEscape) {
              evt.stopPropagation();
              _onclose();
          }
    }
    document.addEventListener('keydown', helper_esc_key_twbs);
    overlay_under_modal.display();
    return deferred.promise;
}


function fetch_categorical_colors(){
    let categ = document.getElementsByClassName("typo_class"),
        color_map = new Map();
    for(let i = 0; i < categ.length; i++){
        let color = rgb2hex(categ[i].querySelector(".color_square").style.backgroundColor),
            new_name = categ[i].querySelector(".typo_name").value,
            nb_features = categ[i].querySelector('.typo_count_ft').getAttribute('data-count');
        color_map.set(categ[i].__data__.name, [color, new_name, nb_features]);
    }
    return color_map;
}

function display_categorical_box(data_layer, layer_name, field, cats){
    var nb_features = current_layers[layer_name].n_features,
        nb_class = cats.length;

    var modal_box = make_dialog_container(
        "categorical_box",
        i18next.t("app_page.categorical_box.title", {layer: layer_name, nb_features: nb_features}),
        "dialog");

    var newbox = d3.select("#categorical_box").select(".modal-body")
                    .styles({'overflow-y': 'scroll', 'max-height': (window.innerHeight - 145) + 'px'});

    newbox.append("h3").html("")
    newbox.append("p")
        .html(i18next.t("app_page.symbol_typo_box.field_categ", {field: field, nb_class: +nb_class, nb_features: +nb_features}));

    newbox.append("ul").style("padding", "unset").attr("id", "sortable_typo_name")
        .selectAll("li")
        .data(cats).enter()
        .append("li")
            .styles({margin: "auto", "list-style": "none"})
            .attr("class", "typo_class")
            .attr("id", (d,i) => ["line", i].join('_'));

    newbox.selectAll(".typo_class")
            .append("input")
            .styles({width: "140px", height: "auto", display: "inline-block", "vertical-align": "middle", "margin-right": "20px"})
            .attrs(d => ({class: 'typo_name', value: d.display_name, id: d.name}));

    newbox.selectAll(".typo_class")
            .insert("p").attr("class", "color_square")
            .style("background-color", d => d.color)
            .styles({width: "22px", height: "22px", margin: 'auto', 'vertical-align': 'middle',
                     "border-radius": "10%", display: "inline-block"})
            .on("click", function(){
                let self = this;
                let this_color = self.style.backgroundColor;
                let input_col = document.createElement("input");
                input_col.setAttribute("type", "color");
                input_col.setAttribute("value", rgb2hex(this_color));
                input_col.className = "color_input";
                input_col.onchange = function(change){
                    self.style.backgroundColor = hexToRgb(change.target.value, "string");
                }
                let t = input_col.dispatchEvent(new MouseEvent("click"));
            });

    newbox.selectAll(".typo_class")
            .insert("span")
            .attrs(d => ({class: 'typo_count_ft', 'data-count': d.nb_elem}))
            .html( d => i18next.t("app_page.symbol_typo_box.count_feature", {nb_features: +d.nb_elem}));

    newbox.insert("p")
        .insert("button")
        .attr("class", "button_st3")
        .html(i18next.t("app_page.categorical_box.new_random_colors"))
        .on("click", function(){
            let lines = document.getElementsByClassName("typo_class");
            for(let i=0; i<lines.length; ++i){
                lines[i].querySelector(".color_square").style.backgroundColor = Colors.names[Colors.random()];
            }
        });

    new Sortable(document.getElementById("sortable_typo_name"));

    let deferred = Q.defer(),
        container = document.getElementById("categorical_box"),
        _onclose = () => {
            deferred.resolve(false);
            document.removeEventListener('keydown', helper_esc_key_twbs);
            modal_box.close();
            container.remove();
            let p = reOpenParent();
            if(!p) overlay_under_modal.hide();
        };

    container.querySelector(".btn_ok").onclick = function(){
        let color_map = fetch_categorical_colors();
        let colorByFeature = data_layer.map( ft => color_map.get(ft[field])[0] );
        deferred.resolve([nb_class, color_map, colorByFeature]);
        document.removeEventListener('keydown', helper_esc_key_twbs);
        modal_box.close();
        container.remove();
        let p = reOpenParent();
        if(!p) overlay_under_modal.hide();
    }

    container.querySelector(".btn_cancel").onclick = _onclose;
    container.querySelector("#xclose").onclick = _onclose;
    function helper_esc_key_twbs(evt){
          evt = evt || window.event;
          let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
          if (isEscape) {
              evt.stopPropagation();
              _onclose();
          }
    }
    document.addEventListener('keydown', helper_esc_key_twbs);
    overlay_under_modal.display()
    return deferred.promise;
};

function reOpenParent(css_selector){
    let parent_style_box = css_selector !== undefined ? document.querySelector(css_selector) : document.querySelector('.styleBox' );
    if(parent_style_box){
        parent_style_box.className = parent_style_box.className.concat(" in");
        parent_style_box.setAttribute("aria-hidden", false);
        parent_style_box.style.display = "block";
        return true;
    } else {
        return false;
    }
}

var prepare_ref_histo = function(parent_node, serie, formatCount){
    var svg_h = h / 7.25 > 80 ? h / 7.25 : 80,
        svg_w = w / 4 > 320 ? 320 : w / 4,
        values = serie.sorted(),
        nb_bins = 51 < (values.length / 3) ? 50 : Math.ceil(Math.sqrt(values.length)) + 1;
    var q5 = serie.getQuantile(4).map(v => +v);

    var m_margin = {top: 10, right: 20, bottom: 10, left: 20},
        m_width = svg_w - m_margin.right - m_margin.left,
        m_height = svg_h - m_margin.top - m_margin.bottom;

    var ref_histo = parent_node.select("#ref_histo_box").select('#inner_ref_histo_box');
    // ref_histo.node().innerHTML = "";
    ref_histo.append('p')
        .attrs({id: 'ref_histo_title'})
        .styles({"margin": "auto", "text-align": "center"})
        .html('<b>' + i18next.t('disc_box.hist_ref_title') + '</b>');

    var c = ref_histo.append("svg").attr("id", "svg_ref_histo")
        .attr("width", svg_w + m_margin.left + m_margin.right)
        .attr("height", svg_h + m_margin.top + m_margin.bottom)
    var svg_ref_histo = c.append("g")
        .attr("transform", "translate(" + (m_margin.left + m_margin.right) + "," + m_margin.top + ")");

    var x = d3.scaleLinear()
        .domain([serie.min(), serie.max()])
        .rangeRound([0, m_width]);

    return function(type){
        svg_ref_histo.remove();
        svg_ref_histo = c.append("g")
          .attr("transform", "translate(" + (m_margin.left + m_margin.right) + "," + m_margin.top + ")");
        if(type == 'histogram'){
            var data = d3.histogram()
                .domain(x.domain())
                .thresholds(x.ticks(nb_bins))
                (values);

            var y = d3.scaleLinear()
                .domain([0, d3.max(data, function(d) { return d.length; })])
                .range([m_height, 0]);

            var bar = svg_ref_histo.selectAll(".bar")
                .data(data)
              .enter()
                .append("rect")
                .attrs( d => ({
                  "class": "bar", "width": Math.abs(x(d.x1)) - Math.abs(x(d.x0)), "height": m_height - y(d.length), "x": 0,
                  "transform": "translate(" + x(d.x0) + "," + y(d.length) + ")"
                }))
                .styles({fill: "beige", stroke: "black", "stroke-width": "0.4px"});

            svg_ref_histo.append("g")
                .style("font-size", "10px")
                .attrs({'class': 'x_axis', 'transform': 'translate(0,' + m_height + ')'})
                .call(d3.axisBottom()
                    .scale(x)
                    .ticks(4)
                    .tickFormat(formatCount))
                .selectAll("text")
                    .attr("y", 4)
                    .attr("x", -4)
                    .attr("dy", ".45em")
                    .attr("transform", "rotate(-40)")
                    .style("text-anchor", "end");

            svg_ref_histo.append("g")
                .attr("class", "y_axis")
                .style("font-size", "10px")
                .call(d3.axisLeft()
                    .scale(y)
                    .ticks(5)
                    .tickFormat(d3.format(".0f")));
        } else if (type == "box_plot") {
            svg_ref_histo.append("g")
                .style("font-size", "10px")
                .attrs({'class': 'x_axis', 'transform': 'translate(0,' + m_height + ')'})
                .call(d3.axisBottom()
                    .scale(x)
                    .ticks(4)
                    .tickFormat(formatCount))
                .selectAll("text")
                    .attr("y", 4).attr("x", -4)
                    .attr("dy", ".45em")
                    .attr("transform", "rotate(-40)")
                    .style("text-anchor", "end");

            var y_mid = (m_margin.top + m_height - m_margin.bottom) / 2

            var min = svg_ref_histo.append('g')
                    .insert('line')
                    .attrs({x1: x(q5[0]), y1: m_margin.top * 2, x2: x(q5[0]), y2: m_height - m_margin.bottom * 2})
                    .styles({"stroke-width": 1, stroke: "black", fill: "none"});

            var rect = svg_ref_histo.append('g')
                    .insert('rect')
                    .attrs({x: x(q5[1]), y: m_margin.top, width: x(q5[2]) - x(q5[1]), height: m_height - m_margin.bottom - m_margin.top})
                    .styles({"stroke-width": 1, stroke: "black", fill: "lightblue"});

            var med = svg_ref_histo.append('g')
                    .insert('line')
                    .attrs({x1: x(q5[2]), y1: m_margin.top, x2: x(q5[2]), y2:  m_height - m_margin.bottom})
                    .styles({"stroke-width": 3, stroke: "black", fill: "none"});

            var rect = svg_ref_histo.append('g')
                    .insert('rect')
                    .attrs({x: x(q5[2]), y: m_margin.top, width: x(q5[3]) - x(q5[2]), height: m_height - m_margin.bottom - m_margin.top})
                    .styles({"stroke-width": 1, stroke: "black", fill: "lightblue"});

            var max = svg_ref_histo.append('g')
                    .insert('line')
                    .attrs({x1: x(q5[4]), y1: m_margin.top * 2, x2: x(q5[4]), y2: m_height - m_margin.bottom * 2})
                    .styles({"stroke-width": 1, stroke: "black", fill: "none"});

            var interline_min = svg_ref_histo.append('g')
                    .insert('line')
                    .attrs({x1: x(q5[0]), y1: y_mid, x2: x(q5[1]), y2: y_mid})
                    .styles({"stroke-width": 1, stroke: "black", fill: "none", 'stroke-dasharray': '3,3'});

            var interline_max = svg_ref_histo.append('g')
                    .insert('line')
                    .attrs({x1: x(q5[3]), y1: y_mid, x2: x(q5[4]), y2: y_mid})
                    .styles({"stroke-width": 1, stroke: "black", fill: "none", 'stroke-dasharray': '3,3'});
        } else if (type == "beeswarm"){
            var data = values.map(v => ({value: +v}));

            var simulation = d3.forceSimulation(data)
                .force("x", d3.forceX(d => x(d.value)).strength(1))
                .force("y", d3.forceY(m_height / 2).strength(2))
                .force("collide", d3.forceCollide(4))
                .stop();

            for (var i = 0; i < 75; ++i)
                simulation.tick();

            svg_ref_histo.append("g")
                .style("font-size", "10px")
                .attrs({'class': 'x_axis', 'transform': 'translate(0,' + m_height + ')'})
                .call(d3.axisBottom()
                    .scale(x)
                    .ticks(4)
                    .tickFormat(formatCount))
                .selectAll("text")
                    .attr("y", 4).attr("x", -4)
                    .attr("dy", ".45em")
                    .attr("transform", "rotate(-40)")
                    .style("text-anchor", "end");

            var cell = svg_ref_histo.append("g")
                .attr("class", "cells")
              .selectAll("g").data(d3.voronoi()
                  .extent([[0, 0], [m_width, m_height]])
                  .x(d => d.x).y(d => d.y)
                .polygons(data)).enter().append("g");

            cell.append("circle")
                .attrs(d => {
                    if(d) return {
                    r: data.lenght < 250 ? 2.5 : data.lenght < 500 ? 1.5 : 1, transform: 'translate(' + d.data.x + ',' + d.data.y + ')'};
                  });

            cell.append("path")
                .attr('d', d => {if(d) return 'M' + d.join('L') + 'Z'; });
        }
    };
};
