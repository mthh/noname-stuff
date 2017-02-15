"use strict";

var display_discretization_links_discont = function(layer_name, field_name, nb_class, type){
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
        newBox.append("div")
            .attr("id","summary")
            .styles({"margin-left": "25px", "margin-right": "50px",
                     "font-size": "10px", "float": "right"})
            .insert("p")
            .html(["<b>", i18next.t("disc_box.summary"),"</b><br>", content_summary].join(""));
    }

    var update_breaks = function(user_defined){
        if(!user_defined){
            make_min_max_tableau(values, nb_class, type, last_min, last_max, "sizes_div", undefined, callback);
        }
        let tmp_breaks = fetch_min_max_table_value("sizes_div");
        let len_breaks = tmp_breaks.sizes.length;
        breaks_info = [];
        last_min = tmp_breaks.sizes[0];
        last_max = tmp_breaks.sizes[tmp_breaks.sizes.length - 1];
        if(+tmp_breaks.mins[0] > +serie.min()){
            nb_class += 1;
            txt_nb_class.node().value = nb_class;
            // txt_nb_class.html(i18next.t("disc_box.class", {count: nb_class}));
            breaks_info.push([[serie.min(), +tmp_breaks.mins[0]], 0]);
        }

        for(let i = 0; i<len_breaks; i++)
            breaks_info.push([[tmp_breaks.mins[i], tmp_breaks.maxs[i]], tmp_breaks.sizes[i]]);
        breaks = [breaks_info[0][0][0]].concat(breaks_info.map(ft => ft[0][1]));
        if(user_defined){
            make_min_max_tableau(null, nb_class, type, last_min, last_max, "sizes_div", breaks_info, callback);
        }
    }

    var redisplay = {
        compute: function(){
            bins = [];
            for(let i = 0, len = breaks_info.length; i < len; i++){
                let bin = {};
                bin.offset = i == 0 ? 0 : (bins[i-1].width + bins[i-1].offset);
                bin.width = breaks[i+1] - breaks[i];
                bin.height = breaks_info[i][1];
                bins[i] = bin;
            }
            return true;
        },
        draw: function(){
            // Clean-up previously made histogram :
            d3.select("#svg_discretization").selectAll(".bar").remove();

            for(let i=0, len = bins.length; i<len; ++i)
                bins[i].color = array_color[i];

            var x = d3.scaleLinear()
                .domain([serie.min(), serie.max()])
                .range([0, svg_w]);

            var y = d3.scaleLinear()
                .range([svg_h, 0]);

            x.domain([0, d3.max(bins.map(d => d.offset + d.width))]);
            y.domain([0, d3.max(bins.map(d => d.height + d.height / 5))]);

            var bar = svg_histo.selectAll(".bar")
                .data(bins)
              .enter().append("rect")
                .attrs( (d,i) => ({
                  "class": "bar", "id": "bar_" + i, "transform": "translate(0, -17.5)",
                  "x": x(d.offset), "y": y(d.height) - margin.bottom,
                  "width": x(d.width), "height": svg_h - y(d.height)
                }))
                .styles(d => ({
                  "opacity": 0.95,
                  "stroke-opacity": 1,
                  "fill": d.color
                }));

            return true;
        },
    };

    //////////////////////////////////////////////////////////////////////////

    var title_box = [i18next.t("disc_box.title"), " - ", layer_name, " - ", field_name].join('');
    var modal_box = make_dialog_container("discretiz_charts", title_box, "discretiz_charts_dialog");

    var newBox = d3.select("#discretiz_charts").select(".modal-body");

    if(result_data.hasOwnProperty(layer_name)) var db_data = result_data[layer_name];
    else if(user_data.hasOwnProperty(layer_name)) var db_data = user_data[layer_name];

    var color_array = [],
        nb_values = db_data.length,
        indexes = [],
        values = [],
        no_data;

    for(let i=0; i<nb_values; i++){
        if(db_data[i][field_name] != null){
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
        breaks_info = [].concat(current_layers[layer_name].breaks),
        breaks = [+breaks_info[0][0][0]],
        stock_class = [],
        bins = [],
        max_nb_class = 20 < nb_values ? 20 : nb_values,
        sizes = current_layers[layer_name].breaks.map(el => el[1]),
        last_min = min_fast(sizes),
        last_max = max_fast(sizes),
        array_color = d3.schemeCategory20.slice();

    breaks_info.forEach(elem => { breaks.push(elem[0][1]) });

    if(serie.variance() == 0 && serie.stddev() == 0){
        var serie = new geostats(values);
    }

    values = serie.sorted();
//    serie.setPrecision(6);
    var available_functions = [
     [i18next.t("app_page.common.equal_interval"), "equal_interval"],
     [i18next.t("app_page.common.quantiles"), "quantiles"],
     [i18next.t("app_page.common.user_defined"), "user_defined"],
//     [i18next.t("app_page.common.std_dev"), "std_dev"],
     [i18next.t("app_page.common.Q6"), "Q6"],
     [i18next.t("app_page.common.arithmetic_progression"), "arithmetic_progression"],
     [i18next.t("app_page.common.jenks"), "jenks"]
    ];

    if(!serie._hasZeroValue() && !serie._hasZeroValue()){
        available_functions.push([i18next.t("app_page.common.geometric_progression"), "geometric_progression"]);
    }
    var precision_axis = get_precision_axis(serie.min(), serie.max(), serie.precision);
    var formatCount = d3.format(precision_axis);

    var discretization = newBox.append('div')
        .attr("id", "discretization_panel")
        .insert("p").html("Type ")
        .insert("select").attr("class", "params")
        .on("change", function(){
            let old_type = type;
            if(this.value == "user_defined"){
                this.value = old_type;
                return;
            }
            type = this.value;
            if(type === "Q6"){
                nb_class = 6;
                txt_nb_class.node().value = nb_class;
                // txt_nb_class.html(i18next.t("disc_box.class", {count: nb_class}));
                document.getElementById("nb_class_range").value = 6;
            }
            update_breaks();
            redisplay.compute();
            redisplay.draw();
        });

    available_functions.forEach( func => {
        discretization.append("option").text(func[0]).attr("value", func[1]);
    });

    var ref_histo_box = newBox.append('div').attr("id", "ref_histo_box");
    ref_histo_box.append('div').attr('id', 'inner_ref_histo_box');

    discretization.node().value = type;

    make_summary();

    var refDisplay = prepare_ref_histo(newBox, serie, formatCount);
    refDisplay("histogram");

    if(values.length < 750){ // Only allow for beeswarm plot if there isn't too many values
        // as it seems to be costly due to the "simulation" + the voronoi
        let current_histo = "histogram",
            choice_histo = ref_histo_box.append('p').style('text-align', 'center');
        choice_histo.insert('button')
            .attrs({id: 'button_switch_plot', class: 'i18n button_st4', 'data-i18n': '[text]disc_box.switch_ref_histo'})
            .styles({padding: '3px', 'font-size': '10px'})
            .html(i18next.t('disc_box.switch_ref_histo'))
            .on('click', () => {
                if(current_histo == 'histogram'){
                    refDisplay("box_plot");
                    current_histo = "box_plot";
                } else if (current_histo == "box_plot"){
                    refDisplay("beeswarm");
                    current_histo = "beeswarm";
               } else if (current_histo == "beeswarm"){
                     refDisplay("histogram");
                     current_histo = "histogram";
               }
            });
    }

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
        .attrs({id: "nb_class_range", type: "range",
                min: 2, max: max_nb_class, value: nb_class, step:1})
        .on("change", function(){
            type = discretization.node().value;
            if(type == "user_defined"){
                type = "equal_interval";
                discretization.node().value = "equal_interval";
                }
            var old_nb_class = nb_class;
            if(type === "Q6"){
                this.value = 6;
                return;
            }
            nb_class = +this.value;
            txt_nb_class.node().value = nb_class;
            // txt_nb_class.html(i18next.t("disc_box.class", {count: nb_class}));
            update_breaks();
            redisplay.compute();
            redisplay.draw();
        });

    var svg_h = h / 5 > 90 ? h / 5 : 90,
        svg_w = w - (w / 8),
        margin = {top: 17.5, right: 30, bottom: 7.5, left: 30},
        height = svg_h - margin.top - margin.bottom;

    d3.select("#discretiz_charts").select(".modal-dialog")
        .styles({width: svg_w + margin.top + margin.bottom + 90 + "px",
                 height: window.innerHeight - 60 + "px"});

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
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom()
                .scale(x)
                .tickFormat(formatCount));

    var box_content = newBox.append("div").attr("id", "box_content");
    box_content.append("h3").style("margin", "0").html(i18next.t("disc_box.line_size"));
    var sizes_div =  d3.select("#box_content")
                            .append("div").attr("id", "sizes_div");
    var callback = function(){
      discretization.node().value = type;
      update_breaks(true);
      redisplay.compute();
      redisplay.draw();
    };
    make_min_max_tableau(null, nb_class, type, null, null, "sizes_div", breaks_info, callback);

    redisplay.compute();
    redisplay.draw();

    let deferred = Q.defer(),
        container = document.getElementById("discretiz_charts");

    container.querySelector(".btn_ok").onclick = () => {
        breaks[0] = serie.min();
        breaks[nb_class] = serie.max();
        deferred.resolve([serie, breaks_info, breaks]);
        document.removeEventListener('keydown', helper_esc_key_twbs);
        modal_box.close();
        container.remove();
        reOpenParent('.styleBox');
        if(!p) overlay_under_modal.hide();
    }
    let _onclose = () => {
        deferred.resolve(false);
        document.removeEventListener('keydown', helper_esc_key_twbs);
        modal_box.close();
        container.remove();
        let p = reOpenParent('.styleBox');
        if(!p) overlay_under_modal.hide();
    };
    container.querySelector(".btn_cancel").onclick = _onclose;
    container.querySelector("#xclose").onclick = _onclose;
    function helper_esc_key_twbs(evt){
          evt = evt || window.event;
          let isEscape = ("key" in evt) ? (evt.key == "Escape" || evt.key == "Esc") : (evt.keyCode == 27);
          if (isEscape) {
              evt.preventDefault();
              _onclose();
          }
    }
    document.addEventListener('keydown', helper_esc_key_twbs);
    return deferred.promise;
};
