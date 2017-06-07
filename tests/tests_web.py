# -*- coding: utf-8 -*-
from selenium import webdriver
from selenium.webdriver.common.by import By
#from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
from flaky import flaky
from functools import wraps
from uuid import uuid4
import unittest
import time
import os
try:
    import ujson as json
except ImportError:
    import json

def retry(ExceptionToCheck, tries=4, delay=2):
    """
    Retry calling a decorated function

    Credits :
      http://www.saltycrane.com/blog/2009/11/trying-out-retry-decorator-python/
      original from: http://wiki.python.org/moin/PythonDecoratorLibrary#Retry
    """
    def deco_retry(f):
        @wraps(f)
        def f_retry(*args, **kwargs):
            mtries, mdelay = tries, delay
            while mtries > 1:
                try:
                    return f(*args, **kwargs)
                except ExceptionToCheck:
                    time.sleep(mdelay)
                    mtries -= 1
            return f(*args, **kwargs)
        return f_retry  # true decorator
    return deco_retry


@flaky
class MainFunctionnalitiesTest(unittest.TestCase):
    """
    Runs a test using travis-ci and saucelabs
    """

    def setUp(self):
        self.tmp_folder = "/tmp/export_selenium_test_{}/".format(str(uuid4()).split('-')[4])
        os.mkdir(self.tmp_folder)
        chromeOptions = webdriver.ChromeOptions()
        chromeOptions.add_experimental_option(
            "prefs", {"download.default_directory" : self.tmp_folder})
        self.driver = webdriver.Chrome(executable_path='/home/mz/chromedriver', chrome_options=chromeOptions)

        # profile = webdriver.FirefoxProfile()
        # profile.set_preference("browser.download.folderList", 2)
        # profile.set_preference("browser.download.manager.showWhenStarting", False)
        # profile.set_preference("browser.download.dir", self.tmp_folder)
        # profile.set_preference("browser.helperApps.neverAsk.saveToDisk", "image/png,image/svg+xml,application/octet-stream,application/json")
        # self.driver = webdriver.Firefox(executable_path="/home/mz/geckodriver", firefox_profile=profile)

        self.driver.set_window_size(1600, 900)
        self.driver.implicitly_wait(2)
        self.base_url = "http://localhost:9999/modules"
        self.verificationErrors = []
        self.accept_next_alert = True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)
        files = os.listdir(self.tmp_folder)
        [os.remove(self.tmp_folder + file) for file in files]
        os.removedirs(self.tmp_folder)
        self.driver.quit()

    def test_languages(self):
        menu_desc = {"fr": ["Import des données", "Choix de la représentation"],
                     "en": ["Add your data", "Choose a representation"]}
        driver = self.driver
        driver.get(self.base_url)
        button_lang = driver.find_element_by_css_selector("#current_app_lang")
        current_lang = button_lang.text
        menu1 = driver.find_element_by_css_selector("#btn_s1")
        menu2 = driver.find_element_by_css_selector("#btn_s2")
        self.assertEqual(menu1.text, menu_desc[current_lang][0])
        self.assertEqual(menu2.text, menu_desc[current_lang][1])

        button_lang.click()
        driver.find_element_by_css_selector(
            "#menu_lang").find_element_by_xpath("//li[@data-index='1']").click()
        new_lang = driver.find_element_by_css_selector("#current_app_lang").text
        self.assertNotEqual(current_lang, new_lang)

        menu1 = driver.find_element_by_css_selector("#btn_s1")
        menu2 = driver.find_element_by_css_selector("#btn_s2")
        self.assertEqual(menu1.text, menu_desc[new_lang][0])
        self.assertEqual(menu2.text, menu_desc[new_lang][1])

    def test_layout_features(self):
        driver = self.driver
        driver.get(self.base_url)
        self.open_menu_section(4)

        # Test the title :
        new_title = 'The new title!'
        input_title = driver.find_element_by_id('title')
        input_title.clear()
        input_title.send_keys(new_title)
        title_svg = driver.find_element_by_css_selector(
            'g#map_title > text').text
        self.assertEqual(new_title, title_svg)

        # Test the graticule :
        driver.find_element_by_id('btn_graticule').click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "Graticule"):
            self.fail("Graticule won't display")
        if not self.try_element_present(By.CSS_SELECTOR, "li.Graticule"):
            self.fail("Graticule won't appeat in layer manager")

        # Test the sphere element :
        driver.find_element_by_id('btn_sphere').click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "Sphere"):
            self.fail("Sphere background won't display")
        if not self.try_element_present(By.CSS_SELECTOR, "li.Sphere"):
            self.fail("Sphere won't appeat in layer manager")

        # Test the text annotation and feed it with some text :
        driver.find_element_by_id('btn_text_annot').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(1)
        textarea_input = driver.find_element_by_id('annotation_content')
        time.sleep(0.25)
        textarea_input.clear()
        textarea_input.send_keys('Mon annotation de texte')
        driver.find_element_by_css_selector('.btn_ok').click()
        time.sleep(0.5)
        text_annot = driver.find_element_by_id('in_text_annotation_0')
        self.assertEqual(text_annot.is_displayed(), True)
        self.assertEqual(text_annot.text, 'Mon annotation de texte')
        self._verif_context_menu(text_annot, "text annotation")

        # Test the scale bar :
        driver.find_element_by_id('btn_scale').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "scale_bar"):
            self.fail("Scale bar won't display")
        self._verif_context_menu(
            driver.find_element_by_id("scale_bar"), "scale bar")
        self._verif_dbl_click_open_ctx_menu(
            driver.find_element_by_id("scale_bar"), "scale bar")

        # Test the north arrow :
        driver.find_element_by_id('btn_north').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "north_arrow"):
            self.fail("North arrow won't display")
        self._verif_context_menu(
            driver.find_element_by_id("north_arrow"), "north arrow")
        self._verif_dbl_click_open_ctx_menu(
            driver.find_element_by_id("north_arrow"), "north arrow")

        svg_map = driver.find_element_by_id("svg_map")

        # Test the arrow drawn by the user :
        driver.find_element_by_id('btn_arrow').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.1)
        # Move the cursor a bit in order to simulate the drawing of the arrow :
        ac = webdriver.ActionChains(driver)
        ac.move_to_element(svg_map).move_by_offset(10, 10).click().perform()
        driver.find_element_by_id("svg_map").click()
        time.sleep(1)
        if not self.try_element_present(By.ID, "arrow_0"):
            self.fail("User drawn arrow won't display")
        self._verif_context_menu(
            driver.find_element_by_id("arrow_0"), "user arrow")

        # Test the ellipse creation :
        driver.find_element_by_id('btn_ellipse').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.5)
        if not self.try_element_present(By.ID, "user_ellipse_0"):
            self.fail("Ellipse won't display")
        self._verif_context_menu(
            driver.find_element_by_id("user_ellipse_0"), "user ellipse")

        # Test the rectangle creation :
        driver.find_element_by_id('btn_rectangle').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.5)
        if not self.try_element_present(By.ID, "user_rectangle_0"):
            self.fail("Rectangle won't display")
        self._verif_context_menu(
            driver.find_element_by_id("user_rectangle_0"), "user rectangle")

        # Test the map background color :
        driver.execute_script(
            """document.getElementById('bg_color').value = '#da2929';
            document.getElementById('bg_color').dispatchEvent(new Event('change'));"""
            )

        svg_map = driver.find_element_by_id('svg_map')
        self.assertEqual(
            'rgba(218, 41, 41, 1)',
            svg_map.value_of_css_property('background-color'))

    def test_links(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")

        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("world_countries_data")
        driver.find_element_by_css_selector(".btn_ok").click()

        self.waitClickButtonSwal()
        # Valid the type of each field :
        self.validTypefield()
        time.sleep(1)
        with open('tests/load_links.js') as f:
            script = f.read()
        driver.execute_script(script)
        time.sleep(1)
        self.waitClickButtonSwal("button.swal2-cancel.swal2-styled")

        self.open_menu_section(2)
        self.clickWaitTransition("#button_flow")

        Select(driver.find_element_by_id("FlowMap_field_i")
            ).select_by_visible_text("i")
        Select(driver.find_element_by_id("FlowMap_field_j")
            ).select_by_visible_text("j")
        Select(driver.find_element_by_id("FlowMap_field_fij")
            ).select_by_visible_text("fij")

        Select(driver.find_element_by_id("FlowMap_field_join")
            ).select_by_visible_text("ISO2")

        driver.find_element_by_id('FlowMap_output_name').clear()
        driver.find_element_by_id('FlowMap_output_name').send_keys('result_layer')

        driver.find_element_by_id("FlowMap_yes").click()
        self.waitClickButtonSwal()
        if not self.try_element_present(By.ID, "legend_root_lines_class", 5):
            self.fail("Legend not displayed on links map")
        self._verif_legend_hide_show_button('result_layer')
        self._verif_export_result('result_layer')

    def test_gridded(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(2)
        self.clickWaitTransition("#button_grid")

        Select(driver.find_element_by_id("Gridded_field")
            ).select_by_visible_text("POP")
        driver.find_element_by_id("Gridded_cellsize").clear()
        driver.find_element_by_id("Gridded_cellsize").send_keys("145")
        Select(driver.find_element_by_id("Gridded_shape")
            ).select_by_value("Diamond")
        driver.find_element_by_id("Gridded_yes").click()

        self.waitClickButtonSwal()

        if not self.try_element_present(By.ID, "legend_root", 5):
            self.fail("Legend not displayed on grid map")

    def test_generate_labels(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(3)
        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.nuts2-2013-data > div > .style_target_layer"))
        time.sleep(0.5)
        self.clickWaitTransition("#generate_labels")
        Select(driver.find_element_by_css_selector("select.swal2-select")
            ).select_by_value("id")
        self.waitClickButtonSwal()
        time.sleep(1)
        self.click_element_with_retry(".btn_ok")
        time.sleep(0.5)
        labels = driver.find_element_by_id(
            "Labels_id_nuts2-2013-data"
            ).find_elements_by_css_selector("text")
        self.assertIsInstance(labels, list)
        self.assertGreater(len(labels), 0)

    def test_change_projection(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()
        # Valid the type of each field :
        self.validTypefield()

        # Open the section of the menu with the layer manager :
        self.open_menu_section(3)

        # Change the projection for an interrupted one :
        Select(driver.find_element_by_id("form_projection2")
            ).select_by_value("HEALPix")
        time.sleep(2)

        # Global value was updated :
        proj_name = driver.execute_script('value = window.current_proj_name; return value;');
        self.assertEqual(proj_name, "HEALPix")
        # Layer have a clip-path (as this projection is interrupted) :
        clip_path_value1 = driver.execute_script(
            '''val = document.getElementById("World").getAttribute("clip-path");
            return val;''');
        clip_path_value2 = driver.execute_script(
            '''val = document.getElementById("nuts2-2013-data").getAttribute("clip-path");
            return val;''');
        self.assertEqual("url(#clip)", clip_path_value1)
        self.assertEqual("url(#clip)", clip_path_value2)

        # Change for a non-interrupted projection :
        Select(driver.find_element_by_id("form_projection2")
            ).select_by_value("Robinson")
        time.sleep(2)

        # Global value was updated :
        proj_name = driver.execute_script('value = window.current_proj_name; return value;');
        self.assertEqual(proj_name, "Robinson")
        # Layer don't have a clip-path anymore :
        clip_path_value1 = driver.execute_script(
            '''val = document.getElementById("World").getAttribute("clip-path");
            return val;''');
        clip_path_value2 = driver.execute_script(
            '''val = document.getElementById("nuts2-2013-data").getAttribute("clip-path");
            return val;''');
        self.assertEqual(None, clip_path_value1)
        self.assertEqual(None, clip_path_value2)

        # Test that after reprojecting, the map is still centered on the targeted layer :
        # Fetch the current zoom value :
        zoom_val = driver.execute_script(
            '''val = svg_map.__zoom.toString(); return val;''');

        # Click on the "fit-zoom" button of the targeted layer :
        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.nuts2-2013-data > div > #zoom_fit_button"))

        # Fetch again the current zoom value :
        zoom_val2 = driver.execute_script(
            '''val = svg_map.__zoom.toString(); return val;''');
        # Nothing should have change :
        self.assertEqual(zoom_val, zoom_val2)

        # Click on the "fit-zoom" button of an other layer and fetch the new zoom value :
        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.World > div > #eye_closed"))

        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.World > div > #zoom_fit_button"))
        zoom_val3 = driver.execute_script(
            '''val = svg_map.__zoom.toString(); return val;''');
        # This time it should have changed :
        self.assertNotEqual(zoom_val, zoom_val3)

        # Change for a projection with some "preselections":
        Select(driver.find_element_by_id("form_projection2")
            ).select_by_value("AzimuthalEqualAreaEurope")
        time.sleep(2)

        rotate_params = driver.execute_script('''return proj.rotate();''');
        self.assertEqual(rotate_params, [-10, -52, 0])

        # Change for an other preselected projection
        # (this one use proj4 and not the d3-geo-projection ConicConformal)
        Select(driver.find_element_by_id("form_projection2")
            ).select_by_value("ConicConformalFrance")
        time.sleep(2)

    def test_reload_project_localStorage(self):
        driver = self.driver
        driver.get(self.base_url)
        # First render a grid layer :
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(2)
        self.clickWaitTransition("#button_grid")

        Select(driver.find_element_by_id("Gridded_field")).select_by_visible_text("GDP")
        driver.find_element_by_id("Gridded_cellsize").clear()
        driver.find_element_by_id("Gridded_cellsize").send_keys("200")
        Select(driver.find_element_by_id("Gridded_shape")).select_by_value("Square")
        driver.find_element_by_id("Gridded_yes").click()

        self.waitClickButtonSwal()

        self.assertEqual(True, self.try_element_present(By.ID, "legend_root", 5))
        self.open_menu_section(4)

        # Then add some layout features :
        driver.find_element_by_id('btn_scale').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "scale_bar"):
            self.fail("Scale bar won't display")

        driver.find_element_by_id('btn_graticule').click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "Graticule"):
            self.fail("Graticule won't display")

        driver.find_element_by_id('btn_sphere').click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "Sphere"):
            self.fail("Sphere background won't display")

        driver.find_element_by_id('btn_rectangle').click()
        time.sleep(0.2)
        driver.find_element_by_id("svg_map").click()
        time.sleep(0.2)
        if not self.try_element_present(By.ID, "user_rectangle_0"):
            self.fail("Rectangle won't display")

        # Reload the page :
        driver.get(self.base_url)
        time.sleep(0.2)
        # Close the alert asking confirmation for closing the page
        # (this is when the last state of the current project is saved)
        driver.switch_to.alert.accept()

        # Click on the button to reload the last project :
        self.waitClickButtonSwal("button.swal2-cancel")
        time.sleep(1)

        # Assert the various element were reloaded :
        if not self.try_element_present(By.ID, "scale_bar"):
            self.fail("Scale bar not reloaded")

        if not self.try_element_present(By.ID, "Graticule"):
            self.fail("Graticule not reloaded")

        if not self.try_element_present(By.ID, "Sphere"):
            self.fail("Sphere background  not reloaded")

        if not self.try_element_present(By.ID, "user_rectangle_0"):
            self.fail("Rectangle not reloaded")

        # Assert our layers have been reloaded :
        layers = driver.execute_script('''
            return Object.getOwnPropertyNames(window.current_layers);''')
        expected_layers = {
            'World',
            'Sphere',
            'Graticule',
            'nuts2-2013-data',
            'Gridded_200000_GDP'
            }
        self.assertEqual(len(expected_layers), len(layers))
        for name in layers:
            self.assertIn(name, expected_layers)

    def test_project_reload_from_url(self):
        driver = self.driver
        driver.get(
            self.base_url + "?reload=mthh/dac7915b55a3d0704af0a04ebe43fe04")
        if not self.wait_until_overlay_disapear(5):
            self.fail("Overlay not hiding / Project reloading")
        layers = driver.find_elements_by_css_selector('#svg_map > .layer')
        map_elems = driver.find_elements_by_css_selector('#svg_map > *')
        expected_results = [
            'Sphere', 'World', 'world_data',
            'Typo_has_data_world_data', 'Graticule']
        self.assertEqual(len(layers), 5)
        for expected_name, layer in zip(expected_results, layers):
            self.assertEqual(expected_name, layer.get_attribute('id'))

        self.assertEqual(len(map_elems), 8)
        self.assertEqual(map_elems[7].get_attribute('id'), 'map_title')

    def test_downloads(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        # Open the appropriate menu:
        self.open_menu_section(5)

        # Test export to svg:
        Select(driver.find_element_by_id("select_export_type")
            ).select_by_value("svg")
        time.sleep(0.2)
        driver.find_element_by_id("export_button_section5b").click()
        time.sleep(1)
        with open(self.tmp_folder + "export.svg", "r") as f:
            svg_data = f.read()
        self.assertIn('<svg', svg_data)
        self.assertIn('nuts2-2013-data', svg_data)
        os.remove(self.tmp_folder + "export.svg")

        # Test export to png:
        Select(driver.find_element_by_id("select_export_type")
            ).select_by_value("png")
        time.sleep(0.2)
        driver.find_element_by_id("export_button_section5b").click()
        time.sleep(1)
        with open(self.tmp_folder + "export.png", "rb") as f:
            png_data = f.read()
        self.assertGreater(len(png_data), 0)
        time.sleep(0.1)
        os.remove(self.tmp_folder + "export.png")

        # Test export to GeoJSON (from the source layer):
        Select(driver.find_element_by_id("select_export_type")
            ).select_by_value("geo")
        time.sleep(0.2)
        Select(driver.find_element_by_id("layer_to_export")
            ).select_by_visible_text("nuts2-2013-data")
        Select(driver.find_element_by_id("datatype_to_use")
            ).select_by_value("GeoJSON")
        driver.find_element_by_id("export_button_section5b").click()

        time.sleep(2)
        with open(self.tmp_folder + "nuts2-2013-data.geojson", "r") as f:
            raw_geojson = f.read()
        parsed_geojson = json.loads(raw_geojson)
        self.assertIn("features", parsed_geojson)
        self.assertIn("type", parsed_geojson)
        self.assertEqual(len(parsed_geojson["features"]), 323)
        os.remove(self.tmp_folder + "nuts2-2013-data.geojson")

        # Test export to KML (from the source layer):
        Select(driver.find_element_by_id("layer_to_export")
            ).select_by_visible_text("nuts2-2013-data")
        Select(driver.find_element_by_id("datatype_to_use")
            ).select_by_value("KML")
        driver.find_element_by_id("export_button_section5b").click()

        time.sleep(3)
        with open(self.tmp_folder + "nuts2-2013-data.kml", "r") as f:
            raw_kml_file = f.read()
        self.assertIn("<kml xmlns=", raw_kml_file)
        os.remove(self.tmp_folder + "nuts2-2013-data.kml")

        # Test export to GML (from the source layer):
        Select(driver.find_element_by_id("layer_to_export")
            ).select_by_visible_text("nuts2-2013-data")
        Select(driver.find_element_by_id("datatype_to_use")
            ).select_by_value("GML")
        driver.find_element_by_id("export_button_section5b").click()

        time.sleep(2)
        self.assertEqual(
            True, os.path.exists(self.tmp_folder + "nuts2-2013-data.zip"))
        os.remove(self.tmp_folder + "nuts2-2013-data.zip")

        # Test export to Shapefile (from the source layer):
        Select(driver.find_element_by_id("layer_to_export")
            ).select_by_visible_text("nuts2-2013-data")
        Select(driver.find_element_by_id("datatype_to_use")
            ).select_by_value("ESRI Shapefile")
        driver.find_element_by_id("export_button_section5b").click()

        time.sleep(2)
        self.assertEqual(
            True, os.path.exists(self.tmp_folder + "nuts2-2013-data.zip"))
        os.remove(self.tmp_folder + "nuts2-2013-data.zip")

    def test_Typo(self):
        driver = self.driver
        driver.get(self.base_url)
        time.sleep(0.2)
        self.clickWaitTransition("#sample_link")

        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()

        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(3)
        driver.find_element_by_css_selector("li.nuts2-2013-data"
            ).find_elements_by_css_selector("#browse_data_button")[0].click()
        time.sleep(1)

        # Test adding fields to the existing table :
        self.clickWaitTransition("#add_field_button")
        Select(driver.find_element_by_id("type_content_select")
            ).select_by_value("string_field")
        time.sleep(0.3)
        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").clear()
        driver.find_element_by_css_selector(
            "input[value=\"NewFieldName\"]").send_keys("Pays")

        # One categorical field (country) obtained by truncating ids of nuts2 features :
        Select(driver.find_element_by_css_selector(
            "#field_div1 > select")).select_by_visible_text("id")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[2]")).select_by_value("truncate")
        driver.find_element_by_id("val_opt").clear()
        driver.find_element_by_id("val_opt").send_keys("2")
        driver.find_element_by_css_selector(
            ".addFieldBox").find_elements_by_css_selector(
            ".btn_ok")[0].click()
        time.sleep(0.5)
        self.click_elem_retry(
            driver.find_element_by_id(
                "browse_data_box").find_elements_by_css_selector(
                ".btn_ok")[0])
        time.sleep(0.5)
        self.open_menu_section(2)
        self.clickWaitTransition("#button_typo")
        Select(driver.find_element_by_id("Typo_field_1")
            ).select_by_value("Pays")
        time.sleep(0.1)

        driver.find_element_by_id('Typo_output_name').clear()
        driver.find_element_by_id('Typo_output_name').send_keys('result_layer')

        # Valid theses properties and click on the "render" button :
        driver.find_element_by_id("Typo_yes").click()
        time.sleep(0.3)
        # Confirm the fact that there is a lot of features for this kind of representation :
        self.waitClickButtonSwal()

        time.sleep(1)

        if not self.try_element_present(By.CSS_SELECTOR, ".lgdf_result_layer", 5):
            self.fail("Legend not displayed for Categorical map")

        self._verif_legend_hide_show_button('result_layer')

    def test_stewart(self):
        driver = self.driver
        driver.get(self.base_url)
        time.sleep(0.2)
        self.clickWaitTransition("#sample_link")

        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()

        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(2)
        self.clickWaitTransition("#button_smooth")

        driver.find_element_by_id("stewart_nb_class").clear()
        driver.find_element_by_id("stewart_nb_class").send_keys("7")
        driver.find_element_by_id("stewart_span").clear()
        driver.find_element_by_id("stewart_span").send_keys("60")
        Select(driver.find_element_by_id("stewart_mask")
            ).select_by_visible_text("nuts2-2013-data")
        output_name = driver.find_element_by_id("stewart_output_name")
        output_name.clear()
        output_name.send_keys('my_result_0')
        driver.find_element_by_id("stewart_yes").click()
        self.waitClickButtonSwal()
        # The legend is displayed :
        if not self.try_element_present(By.CSS_SELECTOR, ".lgdf_my_result_0", 5):
            self.fail("Legend not displayed on stewart")

        self._verif_legend_hide_show_button('my_result_0')

        # The legend contains the correct number of class :
        legend_elems = driver.find_element_by_class_name(
            'lgdf_my_result_0').find_elements_by_css_selector(
                'rect:not(#under_rect)')
        self.assertEqual(len(legend_elems), 7)
        self._verif_export_result('my_result_0')

        # Test with an other layer, asking for 9 class and no mask :
        self.open_menu_section('2b')
        driver.find_element_by_id("stewart_nb_class").clear()
        driver.find_element_by_id("stewart_nb_class").send_keys("9")
        driver.find_element_by_id("stewart_span").clear()
        driver.find_element_by_id("stewart_span").send_keys("115")
        Select(driver.find_element_by_id("stewart_mask")
            ).select_by_visible_text("None")
        output_name = driver.find_element_by_id("stewart_output_name")
        output_name.clear()
        output_name.send_keys('my_result_1')
        driver.find_element_by_id("stewart_yes").click()
        self.waitClickButtonSwal()
        # The legend is displayed :
        if not self.try_element_present(By.CSS_SELECTOR, ".lgdf_my_result_1", 5):
            self.fail("Legend not displayed on stewart")

        self._verif_legend_hide_show_button('my_result_1')

        # The legend contains the correct number of class :
        legend_elems = driver.find_element_by_class_name(
            'lgdf_my_result_1').find_elements_by_css_selector(
                'rect:not(#under_rect)')
        self.assertEqual(len(legend_elems), 9)
        self._verif_export_result('my_result_1')

        # Test with specifing custom break value :
        self.open_menu_section('2b')
        # This number of class is goona be overriden by our break values :
        driver.find_element_by_id("stewart_nb_class").clear()
        driver.find_element_by_id("stewart_nb_class").send_keys("10")
        driver.find_element_by_id("stewart_span").clear()
        driver.find_element_by_id("stewart_span").send_keys("115")
        Select(driver.find_element_by_id("stewart_mask")
            ).select_by_visible_text("None")
        custom_breaks = driver.find_element_by_id('stewart_breaks')
        custom_breaks.clear()
        custom_breaks.send_keys(
            '''0 - 800000 - 2150000 - 4000000 - 7575000 - 13550000 - 25432798.18274938''')
        output_name = driver.find_element_by_id("stewart_output_name")
        output_name.clear()
        output_name.send_keys('my_result_2')
        driver.find_element_by_id("stewart_yes").click()
        self.waitClickButtonSwal()
        # The legend is displayed :
        if not self.try_element_present(By.CSS_SELECTOR, ".lgdf_my_result_2", 5):
            self.fail("Legend not displayed on stewart")

        self._verif_legend_hide_show_button('my_result_2')

        # The legend contains the correct number of class :
        legend_elems = driver.find_element_by_class_name(
            'lgdf_my_result_2').find_elements_by_css_selector(
                'rect:not(#under_rect)')
        self.assertEqual(len(legend_elems), 6)
        self._verif_export_result('my_result_2')

    def test_cartogram_new_field(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
            ).select_by_value("nuts2-2013-data")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(3)
        driver.find_element_by_css_selector("li.nuts2-2013-data"
            ).find_elements_by_css_selector("#browse_data_button")[0].click()
        time.sleep(1)

        # Test adding fields to the existing table :
        self.clickWaitTransition("#add_field_button")

        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").clear()
        driver.find_element_by_css_selector(
            "input[value=\"NewFieldName\"]").send_keys("NewFieldName3")

        # One field based on an operation betweeen two numerical variables :
        Select(driver.find_element_by_css_selector(
            "#field_div1 > select")).select_by_visible_text("GDP")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[3]")).select_by_visible_text("POP")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[2]")).select_by_visible_text("/")
        driver.find_element_by_css_selector(
            ".addFieldBox").find_elements_by_css_selector(
            ".btn_ok")[0].click()
        time.sleep(0.4)

        self.clickWaitTransition("#add_field_button")
        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").clear()
        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").send_keys("NewFieldName2")

        # One field based on an operation betweeen a numerical variable and a constant :
        Select(driver.find_element_by_css_selector(
            "#field_div1 > select")).select_by_visible_text("POP")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[2]")).select_by_visible_text("/")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[3]")).select_by_value("user_const_value")
        driver.find_element_by_id("val_opt").clear()
        driver.find_element_by_id("val_opt").send_keys("1000")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[2]")).select_by_visible_text("*")
        driver.find_element_by_css_selector(
            ".addFieldBox").find_elements_by_css_selector(
            ".btn_ok")[0].click()
        time.sleep(0.4)

        self.clickWaitTransition("#add_field_button")
        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").clear()
        driver.find_element_by_css_selector("input[value=\"NewFieldName\"]").send_keys("NewFieldName1")

        # One field based on an operation on a char string field
        Select(driver.find_element_by_id(
            "type_content_select")).select_by_value("string_field")
        Select(driver.find_element_by_xpath(
            "//div[@id='field_div1']/select[2]")).select_by_value("truncate")
        driver.find_element_by_id("val_opt").clear()
        driver.find_element_by_id("val_opt").send_keys("2")
        driver.find_element_by_css_selector(
            ".addFieldBox").find_elements_by_css_selector(
            ".btn_ok")[0].click()
        time.sleep(0.4)
        self.click_elem_retry(
            driver.find_element_by_id(
                "browse_data_box").find_elements_by_css_selector(
                ".btn_ok")[0])
        time.sleep(0.4)

        self.open_menu_section(2)
        #  Test the dougenik cartogram functionnality...
        self.clickWaitTransition("#button_cartogram")

        Select(driver.find_element_by_css_selector(
            "select.params")).select_by_visible_text("Dougenik & al. (1985)")

        #  ... using one of these previously computed field :
        Select(driver.find_element_by_id(
            "Anamorph_field")).select_by_visible_text("GDP")
        driver.find_element_by_id('Anamorph_output_name').clear()
        driver.find_element_by_id('Anamorph_output_name').send_keys('carto_doug')
        driver.find_element_by_id("Anamorph_yes").click()
        button_ok = self.get_button_ok_displayed()
        button_ok.click()

        self._verif_export_result('carto_doug')

        Select(driver.find_element_by_css_selector(
            "select.params")).select_by_visible_text("Dougenik & al. (1985)")

        self.open_menu_section('2b')
        #  Test the olson cartogram functionnality...
        Select(driver.find_element_by_css_selector(
            "select.params")).select_by_visible_text("Olson (2005)")

        Select(driver.find_element_by_id(
            "Anamorph_field")).select_by_visible_text("GDP")
        driver.find_element_by_id('Anamorph_output_name').clear()
        driver.find_element_by_id('Anamorph_output_name').send_keys('carto_olson')
        driver.find_element_by_id("Anamorph_yes").click()
        button_ok = self.get_button_ok_displayed()
        button_ok.click()

        self._verif_export_result('carto_olson')

    def test_new_field_choro(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")

        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value("martinique")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()
        time.sleep(0.3)

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(3)
        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.martinique").find_element_by_css_selector(
                "#browse_data_button"))
        time.sleep(0.5)

        self.clickWaitTransition("#add_field_button")
        #  Computing a new field on a layer with more than 3100 features
        #  ... will delegate the operation to the server :
        Select(driver.find_element_by_css_selector("#field_div1 > select")
                ).select_by_visible_text("P13_LOG")
        Select(driver.find_element_by_xpath("//div[@id='field_div1']/select[2]")
                ).select_by_visible_text("/")
        Select(driver.find_element_by_xpath("//div[@id='field_div1']/select[3]")
                ).select_by_visible_text("P13_POP")
        driver.find_element_by_css_selector(
            "input[value=\"NewFieldName\"]").clear()
        driver.find_element_by_css_selector(
            "input[value=\"NewFieldName\"]").send_keys("Ratio")
        driver.find_element_by_css_selector(
            ".addFieldBox").find_elements_by_css_selector(
            ".btn_ok")[0].click()
        self.click_elem_retry(
            driver.find_element_by_id(
                "browse_data_box").find_elements_by_css_selector(
                ".btn_ok")[0])

        self.open_menu_section(2)
        self.clickWaitTransition("#button_choro")
        #  Let's use this new field to render a choropleth map :
        Select(driver.find_element_by_id("choro_field1")
                ).select_by_visible_text("Ratio")
        driver.find_element_by_css_selector("option[value=\"Ratio\"]").click()
        driver.find_element_by_id("ico_others").click()
        self.click_elem_retry(
            driver.find_element_by_id(
                "discretiz_charts").find_elements_by_css_selector(
                ".btn_ok")[0])
        driver.find_element_by_id('Choro_output_name').clear()
        driver.find_element_by_id('Choro_output_name').send_keys('my_result_layer')
        driver.find_element_by_id("choro_yes").click()
        time.sleep(1)  # Little delay for the map to be rendered

        if not self.try_element_present(By.ID, "legend_root", 5):
            self.fail("Legend not displayed on choropleth")

        self._verif_legend_hide_show_button('my_result_layer')

    def test_discont_new_field(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")
        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value("martinique")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(2)
        self.clickWaitTransition("#button_discont")

        Select(driver.find_element_by_id("field_Discont")
                ).select_by_visible_text("P13_POP")
        Select(driver.find_element_by_id("Discont_discKind")
                ).select_by_visible_text("Quantiles")
        if not self.is_element_present(By.ID, "color_Discont"):
            self.fail("Missing features in the interface")
        driver.execute_script(
            "document.getElementById('color_Discont').value = '#da2929';")
        driver.find_element_by_id("Discont_output_name").clear()
        driver.find_element_by_id("Discont_output_name").send_keys('my_result_layer')
        driver.find_element_by_id("yes_Discont").click()
        time.sleep(1)  # Delay for the discontinuities to be computed
        if not self.try_element_present(By.ID, "legend_root_lines_class", 5):
            self.fail("Legend won't display")

        self._verif_legend_hide_show_button("my_result_layer")

        self._verif_export_result('my_result_layer')

    def test_propSymbolsTypo(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition('#sample_link')
        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value('brazil')

        driver.find_element_by_css_selector('.btn_ok').click()
        self.waitClickButtonSwal()
        self.validTypefield()
        self.open_menu_section(2)
        self.clickWaitTransition('#button_proptypo')
        Select(driver.find_element_by_id('PropSymbolTypo_field_1')
                ).select_by_visible_text('Pop2014')
        Select(driver.find_element_by_id('PropSymbolTypo_field_2')
                ).select_by_visible_text('REGIONS')

        driver.find_element_by_id('PropSymbolTypo_output_name').clear()
        driver.find_element_by_id('PropSymbolTypo_output_name').send_keys('my_result_layer')

        driver.find_element_by_id("Typo_class").click()
        time.sleep(0.2)
        # self.waitClickButtonSwal()
        self.click_elem_retry(
            driver.find_element_by_id(
                "categorical_box").find_elements_by_css_selector(
                ".btn_ok")[0])

        driver.find_element_by_id('propTypo_yes').click()
        time.sleep(1.5)
        if not self.try_element_present(By.ID, "legend_root_symbol", 5) \
                or not self.try_element_present(By.ID, 'legend_root'):
            self.fail("Legend won't display on Prop Symbol Choro")

        self._verif_legend_hide_show_button('my_result_layer')

    def test_propSymbolsChoro_and_remove(self):
        driver = self.driver
        driver.get(self.base_url)
        # Add a sample layer :
        self.clickWaitTransition('#sample_link')
        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value('martinique')
        driver.find_element_by_css_selector('.btn_ok').click()
        self.waitClickButtonSwal()
        self.validTypefield()
        time.sleep(0.4)

        # Remove it to load another one :
        driver.find_element_by_id('remove_target').click()
        self.waitClickButtonSwal()

        # Add the layer we really want to add :
        self.clickWaitTransition('#sample_link')
        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value('brazil')
        driver.find_element_by_css_selector('.btn_ok').click()
        self.waitClickButtonSwal()
        self.validTypefield()

        # Render a "stock and ratio" map with its data :
        self.open_menu_section(2)
        self.clickWaitTransition('#button_choroprop')
        Select(driver.find_element_by_id('PropSymbolChoro_field_1')
                ).select_by_visible_text('Pop2014')
        Select(driver.find_element_by_id('PropSymbolChoro_field_2')
                ).select_by_visible_text('popdensity2014')
        driver.find_element_by_id("ico_jenks").click()

        if not self.is_element_present(By.CSS_SELECTOR, "#container_sparkline_propsymbolchoro > canvas"):
            self.fail("Missing mini sparkline canvas in the interface")

        driver.find_element_by_id('PropSymbolChoro_output_name').clear()
        driver.find_element_by_id('PropSymbolChoro_output_name').send_keys('my_result_layer')

        driver.find_element_by_id('propChoro_yes').click()
        time.sleep(1.5)
        if not self.try_element_present(By.ID, "legend_root_symbol", 5) \
                or not self.try_element_present(By.ID, 'legend_root'):
            self.fail("Legend won't display on Prop Symbol Choro")

        self._verif_legend_hide_show_button('my_result_layer')

        # Try to remove a layer from the map (the 'World' layer, here by default):
        driver.find_element_by_css_selector('.sortable.World > div > #trash_button').click()
        # Valid the confirmation :
        self.waitClickButtonSwal()
        nb_layer_t1 = driver.execute_script(
            '''a = Object.getOwnPropertyNames(current_layers).length; return a;''')
        self.assertEqual(nb_layer_t1, 2)
        nb_layer_t2 = driver.execute_script(
            '''a = document.querySelector('.layer_list').childNodes.length; return a;''')
        self.assertEqual(nb_layer_t2, 2)

    def test_propSymbols(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition("#sample_link")

        Select(driver.find_element_by_css_selector("select.sample_target")
                ).select_by_value("GrandParisMunicipalities")
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()

        self.open_menu_section(2)
        self.clickWaitTransition("#button_prop")

        Select(driver.find_element_by_id(
            "PropSymbol_field_1")).select_by_visible_text("TH")
        Select(driver.find_element_by_id(
            "PropSymbol_symbol")).select_by_value("rect")
        Select(driver.find_element_by_id("PropSymbol_nb_colors")
                ).select_by_value("2")
        driver.find_element_by_id("PropSymbol_break_val").clear()
        driver.find_element_by_id("PropSymbol_break_val").send_keys("14553")

        if not self.is_element_present(By.ID, "PropSymbol_color1") \
                or not self.is_element_present(By.ID, "PropSymbol_color2"):
            self.fail("Missing features in the interface")

        driver.execute_script(
            "document.getElementById('PropSymbol_color1').value = '#e3a5f3';")
        driver.execute_script(
            "document.getElementById('PropSymbol_color1').value = '#ffff00';")
        driver.find_element_by_id("PropSymbol_output_name").clear()
        driver.find_element_by_id("PropSymbol_output_name").send_keys('my_result_layer')
        driver.find_element_by_id("PropSymbol_yes").click()
        time.sleep(1.5)

        if not self.try_element_present(By.ID, "legend_root_symbol", 5):
            self.fail("Legend won't display")
        time.sleep(0.1)

        self._verif_legend_hide_show_button('my_result_layer')

        # Test that labels are correctly generated from a layer of prop symbols :
        self.click_elem_retry(
            driver.find_element_by_css_selector(
                "li.my_result_layer > div > .style_target_layer"))
        time.sleep(0.5)
        self.clickWaitTransition("#generate_labels")
        Select(driver.find_element_by_css_selector("select.swal2-select")
            ).select_by_value("LIBCOM")
        self.waitClickButtonSwal()
        time.sleep(1)
        self.click_element_with_retry(".btn_ok")
        time.sleep(0.5)
        labels = driver.find_element_by_id(
            "Labels_LIBCOM_my_result_layer"
            ).find_elements_by_css_selector("text")
        self.assertIsInstance(labels, list)
        self.assertGreater(len(labels), 0)

    def test_extra_basemaps(self):
        driver = self.driver
        driver.get(self.base_url)
        self.clickWaitTransition('#sample_link')
        driver.find_element_by_css_selector("#panel1 > p > span").click()
        time.sleep(0.2)
        # Select an extra basemap :
        Select(driver.find_element_by_css_selector('#panel2 > p > select')
            ).select_by_visible_text('Canada')
        driver.find_element_by_css_selector(".btn_ok").click()
        self.waitClickButtonSwal()

        # Valid the type of each field :
        self.validTypefield()
        time.sleep(0.5)

        self._verif_export_result('Canada')

    def test_add_gml_format(self):
        driver = self.driver
        driver.get(self.base_url)
        with open('tests/load_gml.js') as f:
            script = f.read()
        driver.execute_script(script)
        time.sleep(0.3)
        self.waitClickButtonSwal()
        # Valid the type of each field :
        self.validTypefield()
        time.sleep(1)

        # Field order was preserved :
        fields = driver.execute_script('''
            names = window.current_layers["Ecuador"].fields_type.map(ft => ft.name);
            return names;
            ''');
        expected_fields = [
            "fid", "ID", "ISO", "NAME",
            "AREA", "POP_2001", "POP_2010",
            "POP_DEN", "POP_VAR1", "POP_VAR2"]
        for f1, f2 in zip(fields, expected_fields):
            self.assertEqual(f1, f2)

    def _verif_legend_hide_show_button(self, layer_name):
        driver = self.driver
        button_legend = driver.find_element_by_css_selector("li." + layer_name
            ).find_element_by_css_selector('#legend_button')
        legends = driver.find_elements_by_css_selector(".lgdf_" + layer_name)

        # Hide legend(s) for this representation :
        button_legend.click()
        time.sleep(0.1)
        for lgd in legends:
            self.assertEqual(False, lgd.is_displayed())

        # Redisplay legend(s)
        button_legend.click()
        time.sleep(0.1)
        for lgd in legends:
            self.assertEqual(True, lgd.is_displayed())

    def _verif_export_result(self, layer_name, layer_format="GeoJSON"):
        driver = self.driver
        self.open_menu_section(5)
        time.sleep(0.2)
        Select(driver.find_element_by_id("select_export_type")
            ).select_by_value("geo")
        time.sleep(0.2)
        Select(driver.find_element_by_id("layer_to_export")
            ).select_by_visible_text(layer_name)
        Select(driver.find_element_by_id("datatype_to_use")
            ).select_by_value(layer_format)
        driver.find_element_by_id("export_button_section5b").click()

        time.sleep(2)
        with open(self.tmp_folder + layer_name + ".geojson", "r") as f:
            raw_geojson = f.read()
        parsed_geojson = json.loads(raw_geojson)
        self.assertIn("features", parsed_geojson)
        self.assertIn("type", parsed_geojson)
        os.remove(self.tmp_folder + layer_name + ".geojson")

    def _verif_dbl_click_open_ctx_menu(self, elem, info):
        self.make_double_click(elem)
        time.sleep(0.1)
        if not self.try_element_present(By.CSS_SELECTOR, ".context-menu"):
            self.fail("Context menu of {} won't display on dblclick".format(info))
        self.click_elem_retry(self.driver.find_element_by_id('svg_map'))

    def _verif_context_menu(self, elem, info):
        self.make_context_click(elem)
        time.sleep(0.1)
        if not self.try_element_present(By.CSS_SELECTOR, ".context-menu"):
            self.fail("Context menu of {} won't display".format(info))
        self.click_elem_retry(self.driver.find_element_by_id('svg_map'))

    def make_context_click(self, target):
        action = webdriver.ActionChains(self.driver)
        action.context_click(target).perform()

    def make_double_click(self, target):
        action = webdriver.ActionChains(self.driver)
        action.double_click(target).perform()

    def validTypefield(self):
        self.click_elem_retry(
            self.driver.find_element_by_id(
                "box_type_fields").find_elements_by_css_selector(
                ".btn_ok")[0])
        time.sleep(0.5)

    def changeTypefield(self):
        pass

    def deeper_test_legend(self, id_legend, type_elem):
        legend_root = self.driver.find_element_by_id(id_legend)
        inner_groups = legend_root.find_elements_by_css_selector(".lg")
        self.assertIsInstance(inner_groups, list)
        self.assertGreater(len(inner_groups), 0)
        # Todo : check that right click and dblclick are working too

    def open_menu_section(self, nb_section):
        b = self.driver.find_element_by_id("btn_s{}".format(nb_section))
        if b:
            self.click_elem_retry(b)
            time.sleep(0.5)
        else:
            self.fail("Failed to open menu ", nb_section)

    def clickWaitTransition(self, css_selector, delay=0.5):
        self.driver.find_element_by_css_selector(css_selector).click()
        time.sleep(delay)

    @retry(Exception, 3, 1)
    def click_element_with_retry(self, selector):
        self.driver.find_element_by_css_selector(selector).click()

    @retry(Exception, 3, 1)
    def click_elem_retry(self, elem):
        elem.click()

    def get_button_ok_displayed(self, selector="button.swal2-confirm.swal2-styled", delay=30):
        if not self.try_element_present(By.CSS_SELECTOR, selector, delay):
            self.fail("Time out")
        else:
            button_ok = self.driver.find_element_by_css_selector(selector)
            for i in range(delay):
                if not button_ok.is_displayed():
                    time.sleep(1)
                else:
                    return button_ok
            self.fail("Time out")

    def waitClickButtonSwal(self, selector="button.swal2-confirm.swal2-styled", delay=30):
        button_ok = self.get_button_ok_displayed(selector, delay)
        button_ok.click()
        time.sleep(0.5)

    def is_element_present(self, how, what):
        try:
            self.driver.find_element(by=how, value=what)
        except NoSuchElementException as e:
            return False
        return True

    def is_alert_present(self):
        try:
            self.driver.switch_to_alert()
        except NoAlertPresentException as e:
            return False
        return True

    def try_element_present(self, how, what, delay=60):
        for i in range(delay):
            try:
                if self.is_element_present(how, what):
                    return True
            except:
                pass
            time.sleep(1)
        return False

    def wait_until_overlay_disapear(self, delay=10):
        time.sleep(1)
        for i in range(delay):
            try:
                if self.driver.find_element_by_id(
                        'overlay').value_of_css_property('display') == 'none':
                    return True
            except:
                continue
            time.sleep(1)
        return False

    def close_alert_and_get_its_text(self):
        try:
            alert = self.driver.switch_to_alert()
            alert_text = alert.text
            if self.accept_next_alert:
                alert.accept()
            else:
                alert.dismiss()
            return alert_text
        finally:
            self.accept_next_alert = True


if __name__ == "__main__":
    unittest.main()
