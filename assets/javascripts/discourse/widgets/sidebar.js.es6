import { createWidget } from 'discourse/widgets/widget';

const isNumeric = function(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
};

const hasOrder = function(w) {
  return w.order !== undefined && w.order !== null &&
  (isNumeric(w.order) || (w.order === 'start' || w.order === 'end'));
};

const customWidgets = [];
const addCustomWidget = function(widget) {
  let added = false;

  // replace existing widget record if it exists
  customWidgets.forEach((w, i) => {
    if (w.name === widget.name) {
      added = true;
      customWidgets[i] = widget;
    }
  });

  if (!added) customWidgets.push(widget);
};
export { addCustomWidget };

export default createWidget('sidebar', {
  tagName: 'div.sidebar-content',

  html(args) {
    const user = this.currentUser;
    const { side, context, filter, category, topic, customSidebarProps } = args;

    let siteWidgets = this.site.get('widgets') || [];
    if (customWidgets.length) siteWidgets = siteWidgets.concat(customWidgets);
    let sideWidgets = siteWidgets.length ? siteWidgets.filter((w) => w.position === side) : null;

    let generalWidgets = [];
    let orderedWidgets = [];

    if (sideWidgets) {
      sideWidgets.forEach((w) => {
        if (hasOrder(w)) {
          orderedWidgets.push(w);
        } else {
          generalWidgets.push(w);
        }
      });
    }

    let widgets = [];
    widgets = this.addGeneralWidgets(widgets, generalWidgets, args);
    widgets = this.addOrderedWidgets(widgets, orderedWidgets, args);

    let contents = [];
    let hasWidgets = false;

    widgets.forEach((widget) => {
      if (widget.length) {
        const exists = this.register.lookupFactory(`widget:${widget}`);

        if (exists) {
          let props = { topic, category, side };

          if (customSidebarProps) {
            Object.keys(customSidebarProps).forEach((p) => {
              props[p] = customSidebarProps[p];
            });
          };

          if (props.widgetConditions && props.widgetConditions[widget]) {
            const conditions = props.widgetConditions[widget];

            if (conditions.requiredProp) {
              const propArray = conditions.requiredProp.split('.');
              const isCategory = propArray.indexOf('category') === 0;

              if (isCategory && (!props['category'] || !props['category'].get(propArray[1]))) return;
            }
          }

          hasWidgets = true;

          contents.push(this.attach(widget, props));
        }
      }
    });

    if (!hasWidgets) {
      const controller = this.register.lookup(`controller:${context}`);
      controller.send('noWidgets', side);
    }

    return contents;
  },

  clickOutside() {
    const side = this.attrs.side;
    const $sidebar = $(`.sidebar.${side}`);
    if ($sidebar.length > 0 && $sidebar.hasClass('is-responsive') && $sidebar.hasClass('open')) {
      this.appEvents.trigger('sidebar:toggle', side);
    }
  },

  addGeneralWidgets(widgets, generalWidgets, args) {
    const { side, context, filter, category } = args;
    const siteEnabledGlobal = Discourse.SiteSettings[`layouts_sidebar_${side}_enabled_global`];
    const siteEnabled = Discourse.SiteSettings[`layouts_sidebar_${side}_enabled`].split('|');

    let categoryWidgets;
    let categoryEnabled;
    if (category) {
      const cw = category.get(`layouts_sidebar_${side}_widgets`);
      const ce = category.get(`layouts_sidebar_${side}_enabled`);
      categoryWidgets = cw ? cw.split('|') : [];
      categoryEnabled = ce ? ce.split('|') : false;
    }

    if (context === 'discovery' || context === 'tags') {

      if (!category || siteEnabledGlobal || siteEnabled.indexOf('category') > -1) {
        generalWidgets.forEach((w) => {
          widgets = this.addWidget(widgets, w.name);
        });
      }

      if (categoryEnabled && categoryEnabled.indexOf(filter) > -1) {
        categoryWidgets.forEach((w) => {
          widgets = this.addWidget(widgets, w);
        });
      }
    }

    if (context === 'topic') {
      if (siteEnabledGlobal || siteEnabled.indexOf('topic') > -1) {
        generalWidgets.forEach((w) => {
          widgets = this.addWidget(widgets, w);
        });
      }

      if (categoryEnabled && categoryEnabled.indexOf('topic') > -1) {
        categoryWidgets.forEach((w) => {
          widgets = this.addWidget(widgets, w);
        });
      }
    }

    return widgets;
  },

  addOrderedWidgets(widgets, orderedWidgets, args) {
    orderedWidgets = _.sortBy(orderedWidgets, 'order');

    orderedWidgets.forEach((w) => {
      widgets = this.addWidget(widgets, w, w.order === 'start');
    });

    return widgets;
  },

  addWidget(widgets, widget, start = false) {
    if (widgets.indexOf(widget) === -1) {
      if (start) {
        widgets.unshift(widget);
      } else {
        widgets.push(widget);
      }
    }
    return widgets;
  }
});
