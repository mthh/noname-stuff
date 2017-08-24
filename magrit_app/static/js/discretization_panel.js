'use strict';

function getBreaks(values, type, n_class) {
  const _values = values.filter(v => v && !isNaN(+v)),
    no_data = values.length - _values.length,
    nb_class = +n_class || getOptNbClass(_values.length);
  const serie = new geostats(_values);
  let breaks;
  if (type === 'Q6') {
    const tmp = getBreaksQ6(serie.sorted(), serie.precision);
    breaks = tmp.breaks;
    breaks[0] = serie.min();
    breaks[nb_class] = serie.max();
    serie.setClassManually(breaks);
  } else {
    const _func = discretiz_geostats_switch.get(type);
    breaks = serie[_func](nb_class);
    if (serie.precision) breaks = breaks.map(val => round_value(val, serie.precision));
  }
  return [serie, breaks, nb_class, no_data];
}

function discretize_to_size(values, type, nb_class, min_size, max_size) {
  const [serie, breaks, n_class] = getBreaks(values, type, nb_class);
  const step = (max_size - min_size) / (n_class - 1),
    class_size = Array(n_class).fill(0).map((d, i) => min_size + (i * step)),
    breaks_prop = [];

  for (let i = 0; i < breaks.length - 1; ++i) {
    breaks_prop.push([[breaks[i], breaks[i + 1]], class_size[i]]);
  }
  return [n_class, type, breaks_prop, serie];
}

const discretize_to_colors = (function discretize_to_colors(values, type, nb_class, col_ramp_name) {
  const name_col_ramp = col_ramp_name || 'Reds';
  const [serie, breaks, n_class, nb_no_data] = getBreaks(values, type, nb_class),
    color_array = getColorBrewerArray(n_class, name_col_ramp),
    no_data_color = nb_no_data > 0 ? '#e7e7e7' : null,
    colors_map = [];
  for (let j = 0; j < values.length; ++j) {
    if (values[j] != null && values[j] != '' && !isNaN(+values[j])) {
      const idx = serie.getClass(values[j]);
      colors_map.push(color_array[idx]);
    } else {
      colors_map.push(no_data_color);
    }
  }
  return [n_class, type, breaks, color_array, colors_map, no_data_color];
}).memoize();


const display_discretization = (layer_name, field_name, nb_class, options) => {
  const make_no_data_section = () => {
    const section = d3.select('#color_div')
      .append('div').attr('id', 'no_data_section')
      .append('p')
      .html(i18next.t('disc_box.withnodata', { count: +no_data }));

    section.append('input')
      .attrs({ type: 'color', value: '#ebebcd', id: 'no_data_color' })
      .style('margin', '0px 10px');
  };

  const make_sequ_button = () => {
    const col_div = d3.select('#color_div');
    col_div.selectAll('.color_params').remove();
    col_div.selectAll('.color_txt').remove();
    col_div.selectAll('.color_txt2').remove();
    col_div.selectAll('.central_class').remove();
    col_div.selectAll('.central_color').remove();
    col_div.selectAll('#reverse_pal_btn').remove();
    document.getElementById('button_palette_box').style.display = '';
    const sequential_color_select = col_div.insert('p')
      .attr('class', 'color_txt')
      .style('margin-left', '10px')
      .html(i18next.t('disc_box.color_palette'))
      .insert('select')
      .attr('class', 'color_params')
      .styles({
        width: '116px',
        'background-image': 'url(/static/img/palettes/Blues.png)' })
      .on('change', function () {
        this.style.backgroundImage = `url(/static/img/palettes/${this.value}.png)`;
        redisplay.draw();
      });

    ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd',
      'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
      'Greens', 'Greys', 'Oranges', 'Purples',
      'Reds'].forEach((name) => {
        sequential_color_select.append('option')
          .text(name)
          .attrs({ value: name, title: name })
          .styles({ 'background-image': `url(/static/img/palettes/${name}.png)` });
      });

    if (_app.custom_palettes) {
      const additional_colors = Array.from(_app.custom_palettes.entries());

      for (let ixp = 0; ixp < additional_colors.length; ixp++) {
        sequential_color_select.append('option')
          .text(additional_colors[ixp][0])
          .attrs({ value: `user_${additional_colors[ixp][0]}`, title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length })
          .property('disabled', additional_colors[ixp][1].length !== nb_class);
      }
    }

    const button_reverse = d3.select('.color_txt').insert('p').style('text-align', 'center')
      .insert('button')
      .styles({ 'margin-top': '10px' })
      .attrs({ class: 'button_st3', id: 'reverse_pal_btn' })
      .html(i18next.t('disc_box.reverse_palette'))
      .on('click', () => {
        to_reverse = true;
        redisplay.draw();
      });
  };

  const make_diverg_button = () => {
    const col_div = d3.select('#color_div');
    col_div.selectAll('.color_params').remove();
    col_div.selectAll('.color_txt').remove();
    col_div.selectAll('.color_txt2').remove();
    col_div.selectAll('#reverse_pal_btn').remove();
    document.getElementById('button_palette_box').style.display = 'none';
    col_div.insert('p')
      .attr('class', 'central_class')
      .html(i18next.t('disc_box.break_on'))
      .insert('input')
      .style('width', '50px')
      .attrs({
        type: 'number',
        class: 'central_class',
        id: 'centr_class',
        min: 1,
        max: nb_class - 1,
        step: 1,
        value: Math.round(nb_class / 2) })
      .on('change', () => { redisplay.draw(); });

    const pal_names = ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd',
      'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
      'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'];
    const left_color_select = col_div.insert('p')
      .attr('class', 'color_txt')
      .style('display', 'inline')
      .html(i18next.t('disc_box.left_colramp'))
      .insert('select')
      .style('width', '116px')
      .attr('class', 'color_params_left')
      .on('change', function () {
        this.style.backgroundImage = `url(/static/img/palettes/${this.value}.png)`;
        redisplay.draw();
      });
    const right_color_select = col_div.insert('p')
      .styles({ display: 'inline', 'margin-left': '70px' })
      .attr('class', 'color_txt2')
      .html(i18next.t('disc_box.right_colramp'))
      .insert('select')
      .style('width', '116px')
      .attr('class', 'color_params_right')
      .on('change', function () {
        this.style.backgroundImage = `url(/static/img/palettes/${this.value}.png)`;
        redisplay.draw();
      });
    pal_names.forEach((name) => {
      left_color_select.append('option')
        .attrs({ value: name, title: name })
        .styles({ 'background-image': `url(/static/img/palettes/${name}.png)` })
        .text(name);
      right_color_select.append('option')
        .attrs({ value: name, title: name })
        .styles({ 'background-image': `url(/static/img/palettes/${name}.png)` })
        .text(name);
    });

    // if (_app.custom_palettes) {
    //   const additional_colors = Array.from(
    //     _app.custom_palettes.entries());
    //   for (let ixp = 0; ixp < additional_colors.length; ixp++) {
    //     left_color_select.append('option')
    //       .text(additional_colors[ixp][0])
    //       .attrs({ value: `user_${additional_colors[ixp][0]}`, title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length })
    //       .property('disabled', additional_colors[ixp][1].length !== nb_class);
    //     right_color_select.append('option')
    //       .text(additional_colors[ixp][0])
    //       .attrs({ value: `user_${additional_colors[ixp][0]}`, title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length })
    //       .property('disabled', additional_colors[ixp][1].length !== nb_class);
    //   }
    // }

    document.getElementsByClassName('color_params_right')[0].selectedIndex = 14;

    const central_color = col_div.insert('p').attr('class', 'central_color');
    central_color.insert('input')
      .attrs({ type: 'checkbox', id: 'central_color_chkbx' })
      .on('change', function () {
        redisplay.draw();
        if (this.checked) {
          col_div.select('#central_color_val').style('display', '');
        } else {
          col_div.select('#central_color_val').style('display', 'none');
        }
      });
    central_color.select('input').node().checked = true;
    central_color.insert('label')
      .attr('for', 'central_color_chkbx')
      .html(i18next.t('disc_box.colored_central_class'));
    central_color.insert('input')
      .attrs({ type: 'color', id: 'central_color_val', value: '#e5e5e5' })
      .style('margin', '0px 10px')
      .on('change', redisplay.draw);
  };

  const make_box_histo_option = () => {
    const histo_options = newBox.append('div')
      .attrs({ id: 'histo_options', class: 'row equal' })
      .styles({ margin: '5px 5px 10px 15px', width: '100%' });
    const a = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
      b = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
      c = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
      d = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3');

    a.insert('button')
      .attrs({ class: 'btn_population' })
      .html(i18next.t('disc_box.disp_rug_pop'))
      .on('click', function () {
        if (this.classList.contains('active')) {
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
      .attrs({ class: 'btn_mean' })
      .html(i18next.t('disc_box.disp_mean'))
      .on('click', function () {
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          line_mean.style('stroke-width', 0);
          txt_mean.style('fill', 'none');
          line_mean.classed('active', false);
        } else {
          this.classList.add('active');
          line_mean.style('stroke-width', 2);
          txt_mean.style('fill', 'blue');
          line_mean.classed('active', true);
        }
      });

    c.insert('button')
      .attrs({ class: 'btn_median' })
      .html(i18next.t('disc_box.disp_median'))
      .on('click', function () {
        if (this.classList.contains('active')) {
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
      .attrs({ class: 'btn_stddev' })
      .html(i18next.t('disc_box.disp_sd'))
      .on('click', function () {
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          line_std_left.style('stroke-width', 0);
          line_std_left.classed('active', false);
          line_std_right.style('stroke-width', 0);
          line_std_right.classed('active', false);
        } else {
          this.classList.add('active');
          line_std_left.style('stroke-width', 2);
          line_std_left.classed('active', true);
          line_std_right.style('stroke-width', 2);
          line_std_right.classed('active', true);
        }
      });
  };

  const update_nb_class = (value) => {
    txt_nb_class.node().value = value;
    document.getElementById('nb_class_range').value = value;
    nb_class = value;
    const color_select = document.querySelector('.color_params');
    const selected_index = color_select.selectedIndex;
    const select_options = color_select.querySelectorAll('option');
    for (let ixc = 0; ixc < select_options.length; ixc++) {
      if (select_options[ixc].value.startsWith('user_')) {
        select_options[ixc].disabled = (nb_class !== +select_options[ixc].getAttribute('nb_colors'));
      }
    }
    if (select_options[selected_index].value.startsWith('user_') && select_options[selected_index].getAttribute('nb_colors') !== nb_class) {
      setSelected(color_select, 'Blues');
    }
    // const color_select_left = document.querySelectorAll('.color_params_left > option');
    // const color_select_right = document.querySelectorAll('.color_params_right > option');
    // for (let ixc = 0; ixc < color_select_left.length; ixc++) {
    //   if (color_select_left[ixc].value.startsWith('user_')) {
    //     const is_disabled = (nb_class === +color_select_left[ixc].getAttribute('nb_colors')) ? false : true;
    //     color_select_left[ixc].disabled = is_disabled;
    //     color_select_right[ixc].disabled = is_disabled;
    //   }
    // }
  };

  const update_axis = (group) => {
    group.call(d3.axisBottom()
      .scale(x)
      .tickFormat(formatCount));
  };

  const update_overlay_elements = () => {
    const x_mean = x(mean_serie),
      x_med = x(serie.median()),
      x_std_left = x(mean_serie - stddev_serie),
      x_std_right = x(mean_serie + stddev_serie);
    line_mean.transition().attrs({ x1: x_mean, x2: x_mean });
    txt_mean.transition().attr('x', x_mean);
    line_median.transition().attrs({ x1: x_med, x2: x_med });
    txt_median.transition().attr('x', x_med);
    line_std_left.transition().attrs({ x1: x_std_left, x2: x_std_left });
    line_std_right.transition().attrs({ x1: x_std_right, x2: x_std_right });
    rug_plot.selectAll('.indiv').attrs(d => ({ x1: x(d.value), x2: x(d.value) }));
  };

  const make_overlay_elements = () => {
    line_mean = overlay_svg.append('line')
      .attr('class', 'line_mean')
      .attr('x1', x(mean_serie))
      .attr('y1', 10)
      .attr('x2', x(mean_serie))
      .attr('y2', svg_h - margin.bottom)
      .styles({ 'stroke-width': 0, stroke: 'blue', fill: 'none' })
      .classed('active', false);

    txt_mean = overlay_svg.append('text')
      .attr('y', 0)
      .attr('dy', '0.75em')
      .attr('x', x(mean_serie))
      .style('fill', 'none')
      .attr('text-anchor', 'middle')
      .text(i18next.t('disc_box.mean'));

    line_median = overlay_svg.append('line')
      .attr('class', 'line_med')
      .attr('x1', x(serie.median()))
      .attr('y1', 10)
      .attr('x2', x(serie.median()))
      .attr('y2', svg_h - margin.bottom)
      .styles({ 'stroke-width': 0, stroke: 'darkgreen', fill: 'none' })
      .classed('active', false);

    txt_median = overlay_svg.append('text')
      .attr('y', 0)
      .attr('dy', '0.75em')
      .attr('x', x(serie.median()))
      .style('fill', 'none')
      .attr('text-anchor', 'middle')
      .text(i18next.t('disc_box.median'));

    line_std_left = overlay_svg.append('line')
      .attr('class', 'lines_std')
      .attr('x1', x(mean_serie - stddev_serie))
      .attr('y1', 10)
      .attr('x2', x(mean_serie - stddev_serie))
      .attr('y2', svg_h - margin.bottom)
      .styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' })
      .classed('active', false);

    line_std_right = overlay_svg.append('line')
      .attr('class', 'lines_std')
      .attr('x1', x(mean_serie + stddev_serie))
      .attr('y1', 10)
      .attr('x2', x(mean_serie + stddev_serie))
      .attr('y2', svg_h - margin.bottom)
      .styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' })
      .classed('active', false);

    rug_plot = overlay_svg.append('g')
      .style('display', 'none');
    rug_plot.selectAll('.indiv')
      .data(values.map(i => ({ value: +i })))
      .enter()
      .insert('line')
      .attrs(d => ({ class: 'indiv', x1: x(d.value), y1: svg_h - margin.bottom - 10, x2: x(d.value), y2: svg_h - margin.bottom }))
      .styles({ stroke: 'red', fill: 'none', 'stroke-width': 1 });
  };

  const make_summary = () => {
    const content_summary = make_content_summary(serie);
    newBox.append('div').attr('id', 'summary')
      .styles({ 'font-size': '11px', float: 'right', margin: '10px 10px 0px 10px' })
      .insert('p')
      .html(['<b>', i18next.t('disc_box.summary'), '</b><br>', content_summary].join(''));
  };

  const redisplay = {
    compute() {
      let tmp;
      serie = new geostats(values);
      breaks = [];
      values = serie.sorted();

      if (type === 'Q6') {
        tmp = getBreaksQ6(values, serie.precision);
        // stock_class = tmp.stock_class;
        breaks = tmp.breaks;
        breaks[0] = min_serie;
        breaks[6] = max_serie;
        serie.setClassManually(breaks);
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
      } else if (type === 'stddev_f') {
        tmp = getBreaksStdDev(serie, std_dev_params.share, std_dev_params.role_mean, serie.precision);
        update_nb_class(nb_class = tmp.nb_class);
        breaks = tmp.breaks;
        serie.setClassManually(tmp.breaks);
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
      } else if (type === 'user_defined') {
        tmp = getBreaks_userDefined(serie.sorted(), user_break_list);
        stock_class = tmp.stock_class;
        breaks = tmp.breaks;
        nb_class = tmp.breaks.length - 1;
        update_nb_class(nb_class);

        if (breaks[0] > min_serie) breaks[0] = min_serie;
        if (breaks[nb_class] < max_serie) breaks[nb_class] = max_serie;

        const breaks_serie = breaks.slice();
        if (breaks_serie[0] < min_serie) {
          breaks_serie[0] = min_serie;
        }
        if (breaks_serie[nb_class] > max_serie) {
          breaks_serie[nb_class] = max_serie;
        }
        serie.setClassManually(breaks_serie);
      } else {
        breaks = serie[discretiz_geostats_switch.get(type)](nb_class);
        // if (serie.precision) breaks = breaks.map(val => round_value(val, serie.precision));
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
        if (stock_class.length === 0) {
          return;
        }
      }
      // In order to avoid class limit falling out the serie limits with Std class :
//            breaks[0] = breaks[0] < serie.min() ? serie.min() : breaks[0];
//            ^^^ well finally not ?
      bins = [];
      for (let i = 0, len = stock_class.length, offset = 0; i < len; i++) {
        const bin = {};
        bin.val = stock_class[i];
        bin.offset = i === 0 ? 0 : (bins[i - 1].width + bins[i - 1].offset);
        bin.width = breaks[i + 1] - breaks[i];
        bin.height = bin.val / (breaks[i + 1] - breaks[i]);
        bins[i] = bin;
      }
      return true;
    },

    draw(provided_colors) {
      // Clean-up previously made histogram :
      newBox.select('#svg_discretization').selectAll('.bar').remove();
      newBox.select('#svg_discretization').selectAll('.text_bar').remove();

      if (!provided_colors) {
        const col_scheme = newBox.select('.color_params_left').node() ? 'diverging' : 'sequential';
        if (col_scheme === 'sequential') {
          if (to_reverse) {
            color_array = color_array.reverse();
            to_reverse = false;
          } else {
            const selected_palette = document.querySelector('.color_params').value;
            if (selected_palette.startsWith('user_')) {
              color_array = _app.custom_palettes.get(selected_palette.slice(5));
            } else {
              color_array = getColorBrewerArray(nb_class, selected_palette);
              color_array = color_array.slice(0, nb_class);
            }
          }
        } else if (col_scheme === 'diverging') {
          const left_palette = document.querySelector('.color_params_left').value,
            right_palette = document.querySelector('.color_params_right').value,
            ctl_class_value = +document.getElementById('centr_class').value,
            ctl_class_color = document.querySelector('.central_color > input').checked
                              ? document.getElementById('central_color_val').value
                              : [];

          const class_right = nb_class - ctl_class_value + 1,
            class_left = ctl_class_value - 1,
            max_col_nb = Math.max(class_right, class_left);

          let right_pal = getColorBrewerArray(max_col_nb, right_palette);
          let left_pal = getColorBrewerArray(max_col_nb, left_palette);

          // Below is for the case if we have displayed the custom palette also
          // for a diverging scheme:
          // let right_pal,
          //   left_pal;
          // if (right_palette.startsWith('user_')) {
          //   right_pal = _app.custom_palettes.get(right_palette.slice(5));
          // } else {
          //   right_pal = getColorBrewerArray(max_col_nb, right_palette);
          // }
          // if (left_palette.startsWith('user_')) {
          //   left_pal = _app.custom_palettes.get(left_palette.slice(5));
          // } else {
          //   left_pal = getColorBrewerArray(max_col_nb, left_palette);
          // }
          right_pal = right_pal.slice(0, class_right);
          left_pal = left_pal.slice(0, class_left).reverse();
          color_array = [].concat(left_pal, ctl_class_color, right_pal);
        }
      } else {
        color_array = provided_colors.slice();
      }
      for (let i = 0, len = bins.length; i < len; ++i) {
        bins[i].color = color_array[i];
      }
      x.domain([breaks[0], breaks[breaks.length - 1]]);
      y.domain([0, d3.max(bins.map(d => d.height + d.height / 3))]);

      svg_histo.select('.x_axis')
        .transition()
        .call(update_axis);
      update_overlay_elements();

      const xx = d3.scaleLinear()
        .range([0, svg_w])
        .domain([0, d3.max(bins.map(d => d.offset + d.width))]);

      const bar = svg_histo.selectAll('.bar')
        .data(bins)
        .enter()
        .append('rect')
        .attrs((d, i) => ({
          class: 'bar',
          id: `bar_${i}`,
          transform: 'translate(0, -7.5)',
          x: xx(d.offset),
          y: y(d.height) - margin.bottom,
          width: xx(d.width),
          height: svg_h - y(d.height) }))
        .styles(d => ({
          fill: d.color,
          opacity: 0.95,
          'stroke-opacity': 1 }))
        .on('mouseover', function () {
          this.parentElement.querySelector(`#text_bar_${this.id.split('_')[1]}`).style.display = null;
        })
        .on('mouseout', function () {
          this.parentElement.querySelector(`#text_bar_${this.id.split('_')[1]}`).style.display = 'none';
        });

      svg_histo.selectAll('.txt_bar')
        .data(bins)
        .enter().append('text')
        .attrs((d, i) => ({
          id: `text_bar_${i}`,
          class: 'text_bar',
          'text-anchor': 'middle',
          dy: '.75em',
          x: xx(d.offset + d.width / 2),
          y: y(d.height) - margin.top * 2 - margin.bottom - 1.5 }))
        .styles({ color: 'black', cursor: 'default', display: 'none' })
        .text(d => formatCount(d.val));

      document.getElementById('user_breaks_area').value = breaks.join(' - ');
      return true;
    },
  };

  const modal_box = make_dialog_container(
    'discretiz_charts',
    [i18next.t('disc_box.title'), ' - ', layer_name, ' - ', field_name].join(''),
    'discretiz_charts_dialog',
  );

  const newBox = d3.select('#discretiz_charts').select('.modal-body');
  let db_data;
  if (result_data.hasOwnProperty(layer_name)) {
    db_data = result_data[layer_name];
  } else if (user_data.hasOwnProperty(layer_name)) {
    db_data = user_data[layer_name];
  } else {
    const layer = svg_map.querySelector(`#${_app.idLayer.get(layer_name)}`);
    db_data = Array.prototype.map.call(layer.children, d => d.__data__.properties);
  }
  const indexes = [];
  let color_array = [],
    nb_values = db_data.length,
    values = [],
    no_data;

  let type = options.type;

  for (let i = 0; i < nb_values; i++) {
    const value = db_data[i][field_name];
    if (value != null && value !== '' && isFinite(value) && !isNaN(+value)) {
      values.push(+db_data[i][field_name]);
      indexes.push(i);
    }
  }

  if (nb_values === values.length) {
    no_data = 0;
  } else {
    no_data = nb_values - values.length;
    nb_values = values.length;
  }

  const max_nb_class = nb_values > 20 ? 20 : nb_values;
  let serie = new geostats(values),
    breaks = [],
    stock_class = [],
    bins = [],
    user_break_list = null,
    std_dev_params = options.extra_options && options.extra_options.role_mean ? options.extra_options : { role_mean: 'center', share: 1 };

  if (serie.variance() === 0 && serie.stddev() === 0) {
    serie = new geostats(values);
  }

  const min_serie = serie.min();
  const max_serie = serie.max();
  const mean_serie = serie.mean();
  const stddev_serie = serie.stddev();

  values = serie.sorted();

  const available_functions = [
    [i18next.t('app_page.common.equal_interval'), 'equal_interval'],
    [i18next.t('app_page.common.quantiles'), 'quantiles'],
    [i18next.t('app_page.common.stddev_f'), 'stddev_f'],
    [i18next.t('app_page.common.Q6'), 'Q6'],
    [i18next.t('app_page.common.arithmetic_progression'), 'arithmetic_progression'],
    [i18next.t('app_page.common.jenks'), 'jenks'],
  ];

  if (!serie._hasZeroValue() && !serie._hasNegativeValue()) {
    available_functions.push([i18next.t('app_page.common.geometric_progression'), 'geometric_progression']);
  }
  const precision_axis = get_precision_axis(min_serie, max_serie, serie.precision);
  const formatCount = d3.format(precision_axis);
  const discretization = newBox.append('div')
    .attr('id', 'discretization_panel')
    .insert('p')
    .insert('select')
    .attr('class', 'params')
    .on('change', function () {
      type = this.value;
      if (type === 'stddev_f') {
        input_section_stddev.style('display', '');
        document.getElementById('nb_class_range').disabled = 'disabled';
        txt_nb_class.style('disabled', 'disabled');
        disc_nb_class.style('display', 'none');
      } else {
        input_section_stddev.style('display', 'none');
        document.getElementById('nb_class_range').disabled = false;
        txt_nb_class.style('disabled', false);
        disc_nb_class.style('display', 'inline');
      }
      if (type === 'Q6') {
        update_nb_class(6);
      }
      redisplay.compute();
      redisplay.draw();
    });

  available_functions.forEach((func) => {
    discretization.append('option').text(func[0]).attr('value', func[1]);
  });

  let input_section_stddev = d3.select('#discretization_panel')
    .insert('p')
    .styles({ margin: 'auto', display: type === 'stddev_f' ? '' : 'none' });
  input_section_stddev.insert('span')
    .html(i18next.t('disc_box.stddev_share_txt1'));
  input_section_stddev.insert('input')
    .attrs({ type: 'number', min: 0.1, max: 10, step: 0.1, class: 'without_spinner', id: 'stddev_share', value: std_dev_params.share })
    .styles({ width: '45px', 'margin-left': '10px', 'margin-right': '10px' })
    .on('change', function () {
      const val = this.value;
      if (val === 0 || (val * stddev_serie) > (max_serie - min_serie)
          || (val * stddev_serie * 21) < (max_serie - min_serie)) {
        // If the new value is too big or too small:
        this.value = std_dev_params.share;
        return;
      }
      std_dev_params.share = val;
      redisplay.compute();
      redisplay.draw();
    });
  input_section_stddev.insert('span')
    .html(i18next.t('disc_box.stddev_share_txt2'));
  const std_dev_mean_choice = input_section_stddev.insert('p').style('margin', 'auto');
  std_dev_mean_choice.insert('p')
    .style('margin', 'auto')
    .html(i18next.t('disc_box.stddev_role_mean'));
  [[i18next.t('disc_box.stddev_center_mean'), 'center'],
   [i18next.t('disc_box.stddev_break_mean'), 'bound'],
  ].forEach((el) => {
    std_dev_mean_choice
      .insert('input')
      .attrs({ type: 'radio', name: 'role_mean', value: el[1], id: `button_stddev_${el[1]}` })
      .on('change', function () {
        std_dev_params.role_mean = this.value;
        redisplay.compute();
        redisplay.draw();
      });
    std_dev_mean_choice
      .insert('label')
      .style('font-weight', '400')
      .attrs({ for: `button_stddev_${el[1]}` })
      .html(el[0]);
  });
  document.getElementById(`button_stddev_${std_dev_params.role_mean}`).checked = true;
  let txt_nb_class = d3.select('#discretization_panel').append('input')
    .attrs({ type: 'number', class: 'without_spinner', min: 2, max: max_nb_class, value: nb_class, step: 1 })
    .styles({ width: '30px', margin: '0 10px', 'vertical-align': 'calc(20%)' })
    .on('change', function () {
      const a = disc_nb_class.node();
      a.value = this.value;
      a.dispatchEvent(new Event('change'));
    });

  d3.select('#discretization_panel')
    .append('span')
    .html(i18next.t('disc_box.class'));

  let disc_nb_class = d3.select('#discretization_panel')
    .insert('input')
    .styles({ display: 'inline', width: '60px', 'vertical-align': 'middle', margin: '10px' })
    .attrs({
      id: 'nb_class_range',
      type: 'range',
      min: 2,
      max: max_nb_class,
      value: nb_class,
      step: 1 })
    .on('change', function () {
      type = discretization.node().value;
      const old_nb_class = nb_class;
      if (type === 'Q6') {
        update_nb_class(6);
      } else if (type === 'stddev_f') {
        update_nb_class(nb_class);
        return;
      }
      // nb_class = +this.value;
      // txt_nb_class.node().value = nb_class;
      update_nb_class(+this.value);
      const ret_val = redisplay.compute();
      if (!ret_val) {
        this.value = old_nb_class;
        txt_nb_class.node().value = +old_nb_class;
      } else {
        redisplay.draw();
        const ctl_class = document.getElementById('centr_class');
        if (ctl_class) {
          ctl_class.max = nb_class;
          if (ctl_class > nb_class) ctl_class.value = Math.round(nb_class / 2);
        }
      }
    });

  const ref_histo_box = newBox.append('div').attr('id', 'ref_histo_box');
  ref_histo_box.append('div').attr('id', 'inner_ref_histo_box');

  discretization.node().value = type;
  make_summary();
  const refDisplay = prepare_ref_histo(newBox, serie, formatCount);
  refDisplay('histogram');

  const svg_h = h / 5 > 100 ? h / 5 : 100,
    svg_w = (window.innerWidth - 40) > 760 ? 760 : (window.innerWidth - 40),
    margin = { top: 7.5, right: 30, bottom: 7.5, left: 30 },
    height = svg_h - margin.top - margin.bottom;

  d3.select('#discretiz_charts').select('.modal-dialog')
    .styles({
      width: `${svg_w + margin.top + margin.bottom + 90}px`,
      height: `${window.innerHeight - 60}px` });

  if (values.length < 500) { // Only allow for beeswarm plot if there isn't too many values
      // as it seems to be costly due to the "simulation" + the voronoi
    let current_histo = 'histogram';
    const choice_histo = ref_histo_box.append('p').style('text-align', 'center');
    choice_histo.insert('button')
      .attrs({ id: 'button_switch_plot', class: 'i18n button_st4', 'data-i18n': '[text]disc_box.switch_ref_histo' })
      .styles({ padding: '3px', 'font-size': '10px' })
      .html(i18next.t('disc_box.switch_ref_histo'))
      .on('click', () => {
        let str_tr;
        if (current_histo === 'histogram') {
          refDisplay('box_plot');
          current_histo = 'box_plot';
          str_tr = '_boxplot';
        } else if (current_histo === 'box_plot') {
          refDisplay('beeswarm');
          current_histo = 'beeswarm';
          str_tr = '_beeswarm';
        } else if (current_histo === 'beeswarm') {
          refDisplay('histogram');
          current_histo = 'histogram';
          str_tr = '';
        }
        document.getElementById('ref_histo_title').innerHTML = `<b>${i18next.t('disc_box.hist_ref_title' + str_tr)}</b>`;
      });
  }
  const div_svg = newBox.append('div')
    .append('svg').attr('id', 'svg_discretization')
    .attr('width', svg_w + margin.left + margin.right)
    .attr('height', svg_h + margin.top + margin.bottom);

  make_box_histo_option();

  let svg_histo = div_svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  let x = d3.scaleLinear()
    .domain([min_serie, max_serie])
    .range([0, svg_w]);

  let y = d3.scaleLinear()
    .range([svg_h, 0]);

  let overlay_svg = div_svg.append('g').attr('transform', 'translate(30, 0)'),
    line_mean,
    line_std_right,
    line_std_left,
    line_median,
    txt_median,
    txt_mean,
    rug_plot;

  make_overlay_elements();

  svg_histo.append('g')
    .attr('class', 'x_axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom()
    .scale(x)
    .tickFormat(formatCount));

  const b_accordion_colors = newBox.append('button')
    .attrs({ class: 'accordion_disc active', id: 'btn_acc_disc_color' })
    .style('padding', '0 6px')
    .html(i18next.t('disc_box.title_color_scheme'));
  const accordion_colors = newBox.append('div')
    .attrs({ class: 'panel show', id: 'accordion_colors' })
    .style('width', '98%');
  const color_scheme = accordion_colors // d3.select('#accordion_colors')
    .append('div')
    .attr('id', 'color_div')
    .style('text-align', 'center');

  [[i18next.t('disc_box.sequential'), 'sequential'],
   [i18next.t('disc_box.diverging'), 'diverging'],
  ].forEach((el) => {
    color_scheme.insert('label').style('margin', '20px').html(el[0])
      .insert('input')
      .attrs({ type: 'radio', name: 'color_scheme', value: el[1], id: `button_${el[1]}` })
      .on('change', function () {
        if (this.value === 'sequential') {
          make_sequ_button();
        } else {
          make_diverg_button();
        }
        redisplay.draw();
      });
  });
  let to_reverse = false;
  document.getElementById('button_sequential').checked = true;
  accordion_colors
    .append('span')
    .attr('id', 'button_palette_box')
    .styles({
      margin: '5px',
      float: 'right',
      cursor: 'pointer',
    })
    .html(i18next.t('app_page.palette_box.button'))
    .on('click', () => {
      make_box_custom_palette(nb_class)
        .then((result) => {
          if (result) {
            const [colors, palette_name] = result;
            const select_palette = document.querySelector('.color_params');
            addNewCustomPalette(palette_name, colors);
            if (select_palette) {
              d3.select(select_palette)
                .append('option')
                .text(palette_name)
                .attrs({ value: `user_${palette_name}`, title: palette_name, nb_colors: colors.length });
              setSelected(select_palette, `user_${palette_name}`);
            }
            // else {
            //   d3.select('.color_params_right')
            //     .append('option')
            //     .text(palette_name)
            //     .attrs({ value: `user_${palette_name}`, title: palette_name, nb_colors: colors.length });
            //   d3.select('.color_params_left')
            //     .append('option')
            //     .text(palette_name)
            //     .attrs({ value: `user_${palette_name}`, title: palette_name, nb_colors: colors.length });
            // }
          }
        });
    });

  const b_accordion_breaks = newBox.append('button')
    .attrs({ class: 'accordion_disc', id: 'btn_acc_disc_break' })
    .style('padding', '0 6px')
    .html(i18next.t('disc_box.title_break_values'));
  const accordion_breaks = newBox.append('div')
    .attrs({ class: 'panel', id: 'accordion_breaks_vals' })
    .style('width', '98%');
  const user_defined_breaks = accordion_breaks.append('div').attr('id', 'user_breaks');

  user_defined_breaks.insert('textarea')
    .attr('id', 'user_breaks_area')
    .attr('placeholder', i18next.t('app_page.common.expected_class'))
    .style('width', '600px');

  user_defined_breaks
    .insert('button')
    .text(i18next.t('app_page.common.valid'))
    .on('click', () => {
      const old_nb_class = nb_class;
      user_break_list = document.getElementById('user_breaks_area').value;
      type = 'user_defined';
      // nb_class = user_break_list.split('-').length - 1;
      // txt_nb_class.node().value = +nb_class;
      // txt_nb_class.html(i18next.t("disc_box.class", {count: +nb_class}));
      // document.getElementById("nb_class_range").value = nb_class;
      redisplay.compute();
      redisplay.draw();
    });

  accordionize('.accordion_disc', d3.select('#discretiz_charts').node());

  if (no_data > 0) {
    make_no_data_section();
    if (options.no_data) {
      document.getElementById('no_data_color').value = options.no_data;
    }
  }

  if (!options.schema) {
    make_sequ_button();
  } else if (options.schema.length === 1) {
    make_sequ_button();
    document.querySelector('.color_params').value = options.schema[0];
    document.querySelector('.color_params').style.backgroundImage = `url(/static/img/palettes/${options.schema[0]}.png)`;
  } else if (options.schema.length > 1) {
    make_diverg_button();
    document.getElementById('button_diverging').checked = true;
    let tmp = 0;
    setSelected(document.querySelector('.color_params_left'), options.schema[0]);
    // document.querySelector(".color_params_left").value = options.schema[0];
    if (options.schema.length > 2) {
      const elem = document.getElementById('central_color_val');
      elem.style.display = '';
      elem.value = options.schema[1];
      tmp = 1;
      document.querySelector('.central_color').querySelector('input').checked = true;
    } else {
      document.querySelector('.central_color').querySelector('input').checked = false;
    }
    setSelected(document.querySelector('.color_params_right'), options.schema[1 + tmp]);
    // document.querySelector(".color_params_right").value = options.schema[1 + tmp];
  }

  if (options.type && options.type === 'user_defined') {
    user_break_list = options.breaks;
  }

  redisplay.compute();
  redisplay.draw(options.colors);

  const deferred = Promise.pending(),
    container = document.getElementById('discretiz_charts');

  container.querySelector('.btn_ok').onclick = function () {
    breaks = breaks.map(i => +i);
    const colors_map = [];
    let no_data_color = null;
    if (no_data > 0) {
      no_data_color = document.getElementById('no_data_color').value;
    }
    for (let j = 0; j < db_data.length; ++j) {
      const value = db_data[j][field_name];
      if (value !== null && isFinite(value)
            && value != '' && !isNaN(+value)) {
        const idx = serie.getClass(+value);
        colors_map.push(color_array[idx]);
      } else {
        colors_map.push(no_data_color);
      }
    }
    const col_schema = [];
    if (!d3.select('.color_params_left').node()) {
      col_schema.push(document.querySelector('.color_params').value);
    } else {
      col_schema.push(document.querySelector('.color_params_left').value);
      if (document.querySelector('.central_color').querySelector('input').checked) {
        col_schema.push(document.getElementById('central_color_val').value);
      }
      col_schema.push(document.querySelector('.color_params_right').value);
    }
    deferred.resolve(
      [nb_class, type, breaks, color_array, colors_map, col_schema, no_data_color, type === 'stddev_f' ? std_dev_params : undefined]);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    const p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  const _onclose = () => {
    deferred.resolve(false);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    const p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  const helper_esc_key_twbs = (evt) => {
    const _event = evt || window.event;
    const isEscape = ('key' in _event) ? (_event.key === 'Escape' || _event.key === 'Esc') : (_event.keyCode === 27);
    if (isEscape) {
      _event.stopPropagation();
      _onclose();
    }
  };
  document.addEventListener('keydown', helper_esc_key_twbs);
  overlay_under_modal.display();
  return deferred.promise;
};


function fetch_categorical_colors() {
  const categ = document.getElementsByClassName('typo_class'),
    color_map = new Map();
  for (let i = 0; i < categ.length; i++) {
    const color = rgb2hex(categ[i].querySelector('.color_square').style.backgroundColor),
      new_name = categ[i].querySelector('.typo_name').value,
      nb_features = categ[i].querySelector('.typo_count_ft').getAttribute('data-count');
    color_map.set(categ[i].__data__.name, [color, new_name, nb_features]);
  }
  return color_map;
}

function display_categorical_box(data_layer, layer_name, field, cats) {
  const nb_features = current_layers[layer_name].n_features;
  const nb_class = cats.length;
  const modal_box = make_dialog_container(
    'categorical_box',
    i18next.t('app_page.categorical_box.title', { layer: layer_name, nb_features: nb_features }),
    'dialog');

  const newbox = d3.select('#categorical_box').select('.modal-body')
    .styles({ 'overflow-y': 'scroll', 'max-height': `${window.innerHeight - 145}px` });

  newbox.append('h3').html('');
  newbox.append('p')
      .html(i18next.t('app_page.symbol_typo_box.field_categ', { field: field, nb_class: +nb_class, nb_features: +nb_features }));

  newbox.append('ul')
    .style('padding', 'unset')
    .attr('id', 'sortable_typo_name')
    .selectAll('li')
    .data(cats)
    .enter()
    .append('li')
    .styles({ margin: 'auto', 'list-style': 'none' })
    .attr('class', 'typo_class')
    .attr('id', (d, i) => ['line', i].join('_'));

  newbox.selectAll('.typo_class')
    .append('input')
    .styles({ width: '140px', height: 'auto', display: 'inline-block', 'vertical-align': 'middle', 'margin-right': '20px' })
    .attrs(d => ({ class: 'typo_name', value: d.display_name, id: d.name }));

  newbox.selectAll('.typo_class')
    .insert('p').attr('class', 'color_square')
    .style('background-color', d => d.color)
    .styles({ width: '22px',
      height: '22px',
      margin: 'auto',
      display: 'inline-block',
      'vertical-align': 'middle',
      'border-radius': '10%' })
    .on('click', function () {
      const self = this;
      const this_color = self.style.backgroundColor;
      const input_col = document.createElement('input');
      input_col.setAttribute('type', 'color');
      input_col.setAttribute('value', rgb2hex(this_color));
      input_col.className = 'color_input';
      input_col.onchange = function (change) {
        self.style.backgroundColor = hexToRgb(change.target.value, 'string');
      };
      input_col.dispatchEvent(new MouseEvent('click'));
    });

  newbox.selectAll('.typo_class')
    .insert('span')
    .attrs(d => ({ class: 'typo_count_ft', 'data-count': d.nb_elem }))
    .html(d => i18next.t('app_page.symbol_typo_box.count_feature', { nb_features: +d.nb_elem }));

  newbox.insert('p')
    .insert('button')
    .attr('class', 'button_st3')
    .html(i18next.t('app_page.categorical_box.new_random_colors'))
    .on('click', () => {
      const lines = document.getElementsByClassName('typo_class');
      for (let i = 0; i < lines.length; ++i) {
        lines[i].querySelector('.color_square').style.backgroundColor = randomColor();
      }
    });

  new Sortable(document.getElementById('sortable_typo_name'));

  const deferred = Promise.pending();
  const container = document.getElementById('categorical_box');
  const _onclose = () => {
    deferred.resolve(false);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    const p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  container.querySelector('.btn_ok').onclick = () => {
    const color_map = fetch_categorical_colors();
    const colorByFeature = data_layer.map(ft => color_map.get(ft[field])[0]);
    deferred.resolve([nb_class, color_map, colorByFeature]);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    const p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  function helper_esc_key_twbs(evt) {
    const _event = evt || window.event;
    const isEscape = ('key' in _event) ? (_event.key === 'Escape' || _event.key === 'Esc') : (_event.keyCode === 27);
    if (isEscape) {
      _event.stopPropagation();
      _onclose();
    }
  }
  document.addEventListener('keydown', helper_esc_key_twbs);
  overlay_under_modal.display();
  return deferred.promise;
}

function reOpenParent(css_selector) {
  const parent_style_box = css_selector !== undefined ? document.querySelector(css_selector) : document.querySelector('.styleBox');
  if (parent_style_box && parent_style_box.modal && parent_style_box.modal.show) {
    parent_style_box.modal.show();
    return true;
  }
  return false;
}

const prepare_ref_histo = (parent_node, serie, formatCount) => {
  const svg_h = h / 7.25 > 80 ? h / 7.25 : 80,
    svg_w = w / 4 > 320 ? 320 : w / 4,
    values = serie.sorted(),
    nb_bins = (values.length / 3) > 51 ? 50 : Math.ceil(Math.sqrt(values.length)) + 1;

  const q5 = serie.getQuantile(4).map(v => +v);

  const m_margin = { top: 10, right: 20, bottom: 10, left: 20 },
    m_width = svg_w - m_margin.right - m_margin.left,
    m_height = svg_h - m_margin.top - m_margin.bottom;

  const ref_histo = parent_node.select('#ref_histo_box').select('#inner_ref_histo_box');

  ref_histo.append('p')
    .attrs({ id: 'ref_histo_title' })
    .styles({ margin: 'auto', 'text-align': 'center' })
    .html(`<b>${i18next.t('disc_box.hist_ref_title')}</b>`);

  const c = ref_histo.append('svg')
    .attr('id', 'svg_ref_histo')
    .attr('width', svg_w + m_margin.left + m_margin.right)
    .attr('height', svg_h + m_margin.top + m_margin.bottom);

  const x = d3.scaleLinear()
    .domain([serie.min(), serie.max()])
    .rangeRound([0, m_width]);

  let svg_ref_histo = c.append('g')
    .attr('transform', 'translate(' + (m_margin.left + m_margin.right) + ',' + m_margin.top + ')');

  return (type) => {
    svg_ref_histo.remove();
    svg_ref_histo = c.append('g')
      .attr('transform', 'translate(' + (m_margin.left + m_margin.right) + ',' + m_margin.top + ')');
    if (type === 'histogram') {
      const data = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(nb_bins))(values);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.length)])
        .range([m_height, 0]);

      const bar = svg_ref_histo.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attrs(d => ({
          class: 'bar',
          width: Math.abs(x(d.x1)) - Math.abs(x(d.x0)),
          height: m_height - y(d.length),
          x: 0,
          transform: 'translate(' + x(d.x0) + ',' + y(d.length) + ')' }))
        .styles({ fill: 'beige', stroke: 'black', 'stroke-width': '0.4px' });

      svg_ref_histo.append('g')
        .style('font-size', '10px')
        .attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' })
        .call(d3.axisBottom()
          .scale(x)
          .ticks(4)
          .tickFormat(formatCount))
        .selectAll('text')
        .attr('y', 4)
        .attr('x', -4)
        .attr('dy', '.45em')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');

      svg_ref_histo.append('g')
        .attr('class', 'y_axis')
        .style('font-size', '10px')
        .call(d3.axisLeft()
          .scale(y)
          .ticks(5)
          .tickFormat(d3.format('.0f')));
    } else if (type === 'box_plot') {
      svg_ref_histo.append('g')
        .style('font-size', '10px')
        .attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' })
        .call(d3.axisBottom()
          .scale(x)
          .ticks(4)
          .tickFormat(formatCount))
        .selectAll('text')
        .attr('y', 4)
        .attr('x', -4)
        .attr('dy', '.45em')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');

      const y_mid = (m_margin.top + m_height - m_margin.bottom) / 2;

      svg_ref_histo.append('g')
        .insert('line')
        .attrs({ x1: x(q5[0]), y1: m_margin.top * 2, x2: x(q5[0]), y2: m_height - m_margin.bottom * 2 })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g')
        .insert('rect')
        .attrs({ x: x(q5[1]), y: m_margin.top, width: x(q5[2]) - x(q5[1]), height: m_height - m_margin.bottom - m_margin.top })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'lightblue' });

      svg_ref_histo.append('g')
        .insert('line')
        .attrs({ x1: x(q5[2]), y1: m_margin.top, x2: x(q5[2]), y2: m_height - m_margin.bottom })
        .styles({ 'stroke-width': 3, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g')
        .insert('rect')
        .attrs({ x: x(q5[2]), y: m_margin.top, width: x(q5[3]) - x(q5[2]), height: m_height - m_margin.bottom - m_margin.top })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'lightblue' });

      svg_ref_histo.append('g')
        .insert('line')
        .attrs({ x1: x(q5[4]), y1: m_margin.top * 2, x2: x(q5[4]), y2: m_height - m_margin.bottom * 2 })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g')
        .insert('line')
        .attrs({ x1: x(q5[0]), y1: y_mid, x2: x(q5[1]), y2: y_mid })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'none', 'stroke-dasharray': '3,3' });

      svg_ref_histo.append('g')
        .insert('line')
        .attrs({ x1: x(q5[3]), y1: y_mid, x2: x(q5[4]), y2: y_mid })
        .styles({ 'stroke-width': 1, stroke: 'black', fill: 'none', 'stroke-dasharray': '3,3' });
    } else if (type === 'beeswarm') {
      const data = values.map(v => ({ value: +v }));

      const simulation = d3.forceSimulation(data)
        .force('x', d3.forceX(d => x(d.value)).strength(1))
        .force('y', d3.forceY(m_height / 2).strength(2))
        .force('collide', d3.forceCollide(4))
        .stop();

      for (let i = 0; i < 75; ++i) {
        simulation.tick();
      }
      svg_ref_histo.append('g')
        .style('font-size', '10px')
        .attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' })
        .call(d3.axisBottom()
          .scale(x)
          .ticks(4)
          .tickFormat(formatCount))
        .selectAll('text')
        .attr('y', 4)
        .attr('x', -4)
        .attr('dy', '.45em')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');

      const cell = svg_ref_histo.append('g')
        .attr('class', 'cells')
        .selectAll('g')
        .data(d3.voronoi()
          .extent([[0, 0], [m_width, m_height]])
          .x(d => d.x)
          .y(d => d.y)
          .polygons(data))
        .enter()
        .append('g');

      cell.append('circle')
        .attrs((d) => {
          if (d) {
            return {
              r: data.lenght < 250 ? 2.5 : data.lenght < 500 ? 1.5 : 1,
              transform: `translate(${d.data.x},${d.data.y})` };
          }
          return undefined;
        });

      cell.append('path')
        .attr('d', (d) => {
          if (d) return `M${d.join('L')}Z`;
          return undefined;
        });
    }
  };
};

function make_box_custom_palette(nb_class, existing_colors) {
  const is_hex_color = new RegExp(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  const is_ok_name = new RegExp(/^[a-zA-Z0-9_]*$/);
  const existing_palette = Array.from(_app.custom_palettes.keys());
  let pal_name;
  let ref_colors;
  if (existing_colors && existing_colors.length === nb_class) {
    ref_colors = existing_colors.slice();
  } else {
    ref_colors = [];
    for (let i = 0; i < nb_class; i++) {
      ref_colors.push(randomColor());
    }
  }

  const verif_palette_name = (name) => {
    if (name !== '' && is_ok_name.test(name)) {
      if (existing_palette.indexOf(name) > -1) {
        d3.select('#palette_box_error_zone')
          .html(i18next.t('app_page.palette_box.error_name_existing'));
        document.querySelector('.swal2-confirm').disabled = true;
        return null;
      }
      d3.select('#palette_box_error_zone')
        .html('');
      document.querySelector('.swal2-confirm').disabled = false;
      return name;
    } else {
      d3.select('#palette_box_error_zone')
        .html(i18next.t('app_page.palette_box.error_name_invalid'));
      document.querySelector('.swal2-confirm').disabled = true;
      return null;
    }
  };

  return swal({
    title: i18next.t('app_page.palette_box.title'),
    html: '<div id="palette_box_content" style="display: inline-flex;"></div><div id="palette_box_name"></div>',
    showCancelButton: true,
    showConfirmButton: true,
    cancelButtonText: i18next.t('app_page.common.close'),
    animation: 'slide-from-top',
    onOpen: () => {
      document.querySelector('.swal2-modal').style.width = `${nb_class * 85}px`;
      const colors = d3.select('#palette_box_content');
      const g = colors.selectAll('p')
        .data(ref_colors)
        .enter()
        .append('p');

      g.append('input')
        .attr('id', (d, i) => i)
        .attr('type', 'color')
        .property('value', d => d)
        .style('width', '60px')
        .on('change', function (d, i) {
          ref_colors[i] = this.value;
          this.nextSibling.value = this.value;
        });

      g.append('input')
        .attr('id', (d, i) => i)
        .property('value', d => d)
        .style('width', '60px')
        .on('keyup', function (d, i) {
          if (is_hex_color.test(this.value)) {
            ref_colors[i] = this.value;
            this.previousSibling.value = this.value;
          }
        });
      const bottom = d3.select('#palette_box_name');
      bottom.append('p')
        .attr('id', 'palette_box_error_zone')
        .style('background', '#e3e3e3');
      bottom
        .append('span')
        .html(i18next.t('app_page.palette_box.new_name'));
      bottom
        .append('input')
        .style('width', '70px')
        .on('keyup', function () {
          if (verif_palette_name(this.value) !== null) pal_name = this.value;
        });
      document.querySelector('.swal2-confirm').disabled = true;
    },
  }).then(
    v => [ref_colors, pal_name],
    dismissValue => null,
  );
}
