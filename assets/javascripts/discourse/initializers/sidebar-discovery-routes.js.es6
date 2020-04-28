import { renderTemplateTopic, renderTemplateCategory } from '../lib/layouts-display';
import { settingEnabled, excludedFilters } from '../lib/layouts-settings';
import { withPluginApi } from 'discourse/lib/plugin-api';

export default {
  name: 'sidebar-discovery-routes',
  initialize(container){
    const site = container.lookup('site:main');
    const siteSettings = container.lookup('site-settings:main');

    if (!siteSettings.layouts_enabled ||
        (site.mobileView && !siteSettings.layouts_mobile_enabled)) return;

    let discoveryTopicRoutes = [];
    let discoveryCategoryRoutes = [
      'Category',
      'ParentCategory',
      'CategoryNone',
      'CategoryWithID'
    ];
    let filters = site.get('filters');
    filters.push('top');
    filters = filters.filter((f) => excludedFilters.indexOf(f) === -1);
    filters.forEach(filter => {
      const filterCapitalized = filter.capitalize();
      discoveryTopicRoutes.push(filterCapitalized);
      discoveryCategoryRoutes.push(...[
        `${filterCapitalized}Category`,
        `${filterCapitalized}ParentCategory`,
        `${filterCapitalized}CategoryNone`
      ]);
    });

    site.get('periods').forEach(period => {
      const periodCapitalized = period.capitalize();
      discoveryTopicRoutes.push(`Top${periodCapitalized}`);
      discoveryCategoryRoutes.push(...[
        `Top${periodCapitalized}Category`,
        `Top${periodCapitalized}ParentCategory`,
        `Top${periodCapitalized}CategoryNone`
      ]);
    });

    discoveryTopicRoutes.forEach(function(route){
      var route = container.lookup(`route:discovery.${route}`);
      route.reopen({
        renderTemplate() {
          renderTemplateTopic(this, false, this.get('routeName'));
        }
      });
    });

    discoveryCategoryRoutes.forEach(function(route){
      var route = container.lookup(`route:discovery.${route}`);
      route.reopen({
        renderTemplate(controller, model) {
          renderTemplateCategory(this, model.category, this.get('routeName'));
        }
      });
    });

    withPluginApi('0.8.12', api => {
      api.modifyClass(`route:discovery-categories`, {
        renderTemplate() {
          if (!settingEnabled('layouts_list_navigation_disabled', false, 'categories')) {
            this.render('navigation/categories', { outlet: 'navigation-bar' });
          }
          this.render("discovery/categories", { outlet: "list-container" });
        }
      });
    });
  }
};
