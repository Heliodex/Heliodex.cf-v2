
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.45.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.45.0 */

    function create_fragment$8(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(5, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(7, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ['basepath', 'url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$routes,
    		$base
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 128) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 96) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$location,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.45.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    /* src/components/Sidenav.svelte generated by Svelte v3.45.0 */
    const file$6 = "src/components/Sidenav.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let a2;
    	let t6;
    	let a3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "Home";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "Projects";
    			t4 = space();
    			a2 = element("a");
    			a2.textContent = "About";
    			t6 = space();
    			a3 = element("a");
    			a3.textContent = "Contact";
    			if (!src_url_equal(img.src, img_src_value = "/heliodex.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Heliodex Logo");
    			attr_dev(img, "width", "80");
    			attr_dev(img, "height", "80");
    			add_location(img, file$6, 132, 1, 2247);
    			attr_dev(a0, "class", "sidebarLink svelte-tvybwj");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$6, 134, 1, 2320);
    			attr_dev(a1, "class", "sidebarLink svelte-tvybwj");
    			attr_dev(a1, "href", "projects");
    			add_location(a1, file$6, 135, 1, 2372);
    			attr_dev(a2, "class", "sidebarLink svelte-tvybwj");
    			attr_dev(a2, "href", "about");
    			add_location(a2, file$6, 136, 1, 2435);
    			attr_dev(a3, "class", "sidebarLink svelte-tvybwj");
    			attr_dev(a3, "href", "contact");
    			add_location(a3, file$6, 137, 1, 2492);
    			attr_dev(div, "class", "sidenav svelte-tvybwj");
    			add_location(div, file$6, 129, 0, 2165);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, a0);
    			append_dev(div, t2);
    			append_dev(div, a1);
    			append_dev(div, t4);
    			append_dev(div, a2);
    			append_dev(div, t6);
    			append_dev(div, a3);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1)),
    					action_destroyer(link.call(null, a2)),
    					action_destroyer(link.call(null, a3))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sidenav', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sidenav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link });
    	return [];
    }

    class Sidenav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidenav",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Home.svelte generated by Svelte v3.45.0 */
    const file$5 = "src/components/Home.svelte";

    function create_fragment$5(ctx) {
    	let sidenav;
    	let t0;
    	let div;
    	let h1;
    	let t2;
    	let p;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let current;
    	sidenav = new Sidenav({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sidenav.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Heliodex.cf";
    			t2 = space();
    			p = element("p");
    			br0 = element("br");
    			t3 = text("\r\n\tWelcome to Heliodex.cf!");
    			br1 = element("br");
    			t4 = text("\r\n\tThis is my portfolio page where you can see the projects that I've worked on, the teams that I've worked in, and how to contact me.");
    			br2 = element("br");
    			attr_dev(h1, "class", "svelte-tvybwj");
    			add_location(h1, file$5, 133, 1, 2243);
    			add_location(br0, file$5, 135, 1, 2272);
    			add_location(br1, file$5, 136, 24, 2302);
    			add_location(br2, file$5, 137, 132, 2440);
    			attr_dev(p, "class", "svelte-tvybwj");
    			add_location(p, file$5, 134, 1, 2266);
    			attr_dev(div, "class", "main svelte-tvybwj");
    			add_location(div, file$5, 132, 0, 2222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sidenav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			append_dev(p, br1);
    			append_dev(p, t4);
    			append_dev(p, br2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidenav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sidenav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sidenav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, Sidenav });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Projects.svelte generated by Svelte v3.45.0 */
    const file$4 = "src/components/Projects.svelte";

    function create_fragment$4(ctx) {
    	let sidenav;
    	let t0;
    	let div6;
    	let h1;
    	let t2;
    	let br0;
    	let t3;
    	let p0;
    	let t4;
    	let br1;
    	let t5;
    	let br2;
    	let t6;
    	let br3;
    	let t7;
    	let div5;
    	let div0;
    	let h30;
    	let t9;
    	let p1;
    	let t10;
    	let br4;
    	let t11;
    	let br5;
    	let t12;
    	let a0;
    	let t14;
    	let br6;
    	let t15;
    	let br7;
    	let t16;
    	let br8;
    	let t17;
    	let a1;
    	let br9;
    	let t19;
    	let a2;
    	let br10;
    	let t21;
    	let br11;
    	let t22;
    	let img0;
    	let img0_src_value;
    	let t23;
    	let div1;
    	let h31;
    	let t25;
    	let p2;
    	let t26;
    	let br12;
    	let t27;
    	let br13;
    	let t28;
    	let br14;
    	let t29;
    	let a3;
    	let t31;
    	let br15;
    	let t32;
    	let br16;
    	let t33;
    	let br17;
    	let t34;
    	let br18;
    	let t35;
    	let br19;
    	let t36;
    	let a4;
    	let t38;
    	let br20;
    	let t39;
    	let a5;
    	let br21;
    	let t41;
    	let br22;
    	let t42;
    	let img1;
    	let img1_src_value;
    	let t43;
    	let div2;
    	let h32;
    	let t45;
    	let p3;
    	let t46;
    	let br23;
    	let t47;
    	let br24;
    	let t48;
    	let br25;
    	let t49;
    	let br26;
    	let t50;
    	let br27;
    	let t51;
    	let a6;
    	let t53;
    	let br28;
    	let t54;
    	let a7;
    	let t56;
    	let br29;
    	let t57;
    	let br30;
    	let t58;
    	let img2;
    	let img2_src_value;
    	let t59;
    	let div3;
    	let h33;
    	let t61;
    	let p4;
    	let t62;
    	let br31;
    	let t63;
    	let br32;
    	let t64;
    	let br33;
    	let t65;
    	let br34;
    	let t66;
    	let a8;
    	let t68;
    	let br35;
    	let t69;
    	let br36;
    	let t70;
    	let a9;
    	let t72;
    	let br37;
    	let t73;
    	let br38;
    	let t74;
    	let img3;
    	let img3_src_value;
    	let t75;
    	let div4;
    	let h34;
    	let t77;
    	let p5;
    	let t78;
    	let br39;
    	let t79;
    	let br40;
    	let t80;
    	let br41;
    	let t81;
    	let em;
    	let t83;
    	let br42;
    	let t84;
    	let a10;
    	let t86;
    	let br43;
    	let current;
    	sidenav = new Sidenav({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sidenav.$$.fragment);
    			t0 = space();
    			div6 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Projects";
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("Here's a list of all the projects that I have worked on, or the teams I have worked in.");
    			br1 = element("br");
    			t5 = space();
    			br2 = element("br");
    			t6 = space();
    			br3 = element("br");
    			t7 = space();
    			div5 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "DocSocial";
    			t9 = space();
    			p1 = element("p");
    			t10 = text("Docsocial is a free, secure messaging application. It is designed to appear like a Google document from a quick glance, or from a look at your browser history.");
    			br4 = element("br");
    			t11 = space();
    			br5 = element("br");
    			t12 = text("\r\n\t\t\tDocSocial uses ");
    			a0 = element("a");
    			a0.textContent = "Scaledrone";
    			t14 = text(" for its backend and for transferring messages.");
    			br6 = element("br");
    			t15 = space();
    			br7 = element("br");
    			t16 = text("\r\n\t\t\tIt was designed to work best with one specific device and OS, our school-assigned chromebooks, so pupils could chat with others in class and not be caught by a teacher.");
    			br8 = element("br");
    			t17 = space();
    			a1 = element("a");
    			a1.textContent = "DocSocial.tk";
    			br9 = element("br");
    			t19 = space();
    			a2 = element("a");
    			a2.textContent = "DocSocial.cf";
    			br10 = element("br");
    			t21 = space();
    			br11 = element("br");
    			t22 = space();
    			img0 = element("img");
    			t23 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "HybridOS";
    			t25 = space();
    			p2 = element("p");
    			t26 = text("HybridOS was an open-source Python3 'meta-program'.");
    			br12 = element("br");
    			t27 = text("\r\n\t\t\tI avoid calling it an operating system, because... it's not an operating system, it was written in Python.");
    			br13 = element("br");
    			t28 = space();
    			br14 = element("br");
    			t29 = text("\r\n\t\t\tHybridOS was worked on from mid- to late-2019 as a fusion of two similar programs, BlakBird by me, and Vortex by Taskmanager. (");
    			a3 = element("a");
    			a3.textContent = "taski.ml";
    			t31 = text(")");
    			br15 = element("br");
    			t32 = text("\r\n\t\t\tThe program has a total line count of more than 1,100, and had features such as a multi-user signup and login system, a number of games and useful applications, plenty of colourful ASCII art, and a root admin system.");
    			br16 = element("br");
    			t33 = text("\r\n\t\t\tHybridOS was ported to many different languages, including C, C++, Java, C# (twice), and Batch. Even linux distros were made as well!");
    			br17 = element("br");
    			t34 = space();
    			br18 = element("br");
    			t35 = text("\r\n\t\t\tHybridOS was largely abandoned after the beginning of 2020, and the code for the first Python version has been released under The Unlicense on my GitHub page.");
    			br19 = element("br");
    			t36 = space();
    			a4 = element("a");
    			a4.textContent = "Github.com/Heliodex/HybridOS";
    			t38 = space();
    			br20 = element("br");
    			t39 = space();
    			a5 = element("a");
    			a5.textContent = "Something big may be coming soon, though...";
    			br21 = element("br");
    			t41 = space();
    			br22 = element("br");
    			t42 = space();
    			img1 = element("img");
    			t43 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "PF Range Calculator";
    			t45 = space();
    			p3 = element("p");
    			t46 = text("This is a small web tool designed to calculate how far weapons in the game Phantom Forces by StyLiS Studios deal a certain amount of damage to.");
    			br23 = element("br");
    			t47 = text("\r\n\t\t\tYou can input some values provided by the in-game statistics, and the tool will calculate how far it will deal that damage to.");
    			br24 = element("br");
    			t48 = space();
    			br25 = element("br");
    			t49 = text("\r\n\t\t\tThis was created by me in a few days, after I realised how long it would take to calculate all the range values manually.");
    			br26 = element("br");
    			t50 = text("\r\n\t\t\tI remade the site a few months later, being my first time using Svelte.");
    			br27 = element("br");
    			t51 = text("\r\n\t\t\tYou can find the calculator at ");
    			a6 = element("a");
    			a6.textContent = "PFCalc.Heliodex.cf";
    			t53 = text(" .");
    			br28 = element("br");
    			t54 = text("\r\n\t\t\tThe older version can be seen at ");
    			a7 = element("a");
    			a7.textContent = "OldPFCalc.Heliodex.cf";
    			t56 = text(" .");
    			br29 = element("br");
    			t57 = space();
    			br30 = element("br");
    			t58 = space();
    			img2 = element("img");
    			t59 = space();
    			div3 = element("div");
    			h33 = element("h3");
    			h33.textContent = "Crazy Calculations";
    			t61 = space();
    			p4 = element("p");
    			t62 = text("Crazy Calculations was a simple maths game that would test you through 10 levels of increasingly difficult maths questions.");
    			br31 = element("br");
    			t63 = text("\r\n\t\t\tIt was programmed in about a week for a Computer Science class assignment, where a video had to be recorded explaining the project.");
    			br32 = element("br");
    			t64 = text("\r\n\t\t\tThe project was started on 23 September 2021, and submitted on 4 October 2021.");
    			br33 = element("br");
    			t65 = space();
    			br34 = element("br");
    			t66 = text("\r\n\t\t\tThe game was inspired by (and much of the code ported from) ");
    			a8 = element("a");
    			a8.textContent = "You Can't Do Simple Maths Under Pressure";
    			t68 = text(" by UsVsTh3m.");
    			br35 = element("br");
    			t69 = space();
    			br36 = element("br");
    			t70 = text("\r\n\t\t\tCrazy Calculations is playable at ");
    			a9 = element("a");
    			a9.textContent = "Roblox.com/games/7557207546";
    			t72 = text(" .");
    			br37 = element("br");
    			t73 = space();
    			br38 = element("br");
    			t74 = space();
    			img3 = element("img");
    			t75 = space();
    			div4 = element("div");
    			h34 = element("h3");
    			h34.textContent = "Python Calculator Collection";
    			t77 = space();
    			p5 = element("p");
    			t78 = text("This is a collection of calculator programs I wrote on my calculator's python interpreter during maths classes.");
    			br39 = element("br");
    			t79 = text("\r\n\t\t\tThere are programs for calculating interest over time, areas or volumes of polytopes, angles of arcs of circles, and much more.");
    			br40 = element("br");
    			t80 = space();
    			br41 = element("br");
    			t81 = text("\r\n\t\t\tI cannot and will not guarantee the accuracy of these programs, but while they ");
    			em = element("em");
    			em.textContent = "should";
    			t83 = text(" be decently accurate, please submit an issue to the repo if you find an error in any of the programs.");
    			br42 = element("br");
    			t84 = text("\r\n\t\t\tThey are available at ");
    			a10 = element("a");
    			a10.textContent = "GitHub.com/Heliodex/PythonCalculators";
    			t86 = text(" .");
    			br43 = element("br");
    			attr_dev(h1, "class", "svelte-tvybwj");
    			add_location(h1, file$4, 133, 1, 2243);
    			add_location(br0, file$4, 134, 1, 2263);
    			add_location(br1, file$4, 136, 88, 2363);
    			attr_dev(p0, "class", "svelte-tvybwj");
    			add_location(p0, file$4, 135, 1, 2270);
    			add_location(br2, file$4, 138, 1, 2377);
    			add_location(br3, file$4, 139, 1, 2384);
    			attr_dev(h30, "class", "svelte-tvybwj");
    			add_location(h30, file$4, 142, 3, 2443);
    			add_location(br4, file$4, 145, 162, 2635);
    			add_location(br5, file$4, 146, 3, 2644);
    			attr_dev(a0, "class", "realLink svelte-tvybwj");
    			attr_dev(a0, "href", "https://Scaledrone.com/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$4, 147, 18, 2668);
    			add_location(br6, file$4, 147, 172, 2822);
    			add_location(br7, file$4, 148, 3, 2831);
    			add_location(br8, file$4, 149, 171, 3008);
    			attr_dev(a1, "class", "realLink svelte-tvybwj");
    			attr_dev(a1, "href", "https://docsocial.tk/");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$4, 150, 3, 3017);
    			add_location(br9, file$4, 150, 110, 3124);
    			attr_dev(a2, "class", "realLink svelte-tvybwj");
    			attr_dev(a2, "href", "https://docsocial.cf/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noopener noreferrer");
    			add_location(a2, file$4, 151, 3, 3133);
    			add_location(br10, file$4, 151, 110, 3240);
    			add_location(br11, file$4, 152, 3, 3249);
    			if (!src_url_equal(img0.src, img0_src_value = "/images/docsocial.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "DocSocial Logo");
    			attr_dev(img0, "width", "300");
    			add_location(img0, file$4, 155, 3, 3262);
    			attr_dev(p1, "class", "svelte-tvybwj");
    			add_location(p1, file$4, 144, 3, 2468);
    			attr_dev(div0, "class", "project svelte-tvybwj");
    			add_location(div0, file$4, 141, 2, 2417);
    			attr_dev(h31, "class", "svelte-tvybwj");
    			add_location(h31, file$4, 161, 3, 3384);
    			add_location(br12, file$4, 164, 54, 3467);
    			add_location(br13, file$4, 165, 109, 3582);
    			add_location(br14, file$4, 166, 3, 3591);
    			attr_dev(a3, "class", "realLink svelte-tvybwj");
    			attr_dev(a3, "href", "https://taski.ml/");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "rel", "noopener noreferrer");
    			add_location(a3, file$4, 167, 130, 3727);
    			add_location(br15, file$4, 167, 230, 3827);
    			add_location(br16, file$4, 168, 219, 4052);
    			add_location(br17, file$4, 169, 136, 4194);
    			add_location(br18, file$4, 170, 3, 4203);
    			add_location(br19, file$4, 171, 161, 4370);
    			attr_dev(a4, "class", "realLink svelte-tvybwj");
    			attr_dev(a4, "href", "https://github.com/HelioDex/HybridOS/");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "rel", "noopener noreferrer");
    			add_location(a4, file$4, 172, 3, 4379);
    			add_location(br20, file$4, 173, 3, 4523);
    			attr_dev(a5, "class", "realLink svelte-tvybwj");
    			attr_dev(a5, "href", "https://www.youtube.com/watch?v=QwhaqpOL310/");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "rel", "noopener noreferrer");
    			add_location(a5, file$4, 174, 3, 4532);
    			add_location(br21, file$4, 174, 164, 4693);
    			add_location(br22, file$4, 175, 3, 4702);
    			if (!src_url_equal(img1.src, img1_src_value = "/images/hylogos.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "6 different HybridOS Logos throughout the versions");
    			attr_dev(img1, "width", "300");
    			add_location(img1, file$4, 176, 4, 4712);
    			attr_dev(p2, "class", "svelte-tvybwj");
    			add_location(p2, file$4, 163, 3, 3408);
    			attr_dev(div1, "class", "project svelte-tvybwj");
    			add_location(div1, file$4, 159, 2, 3353);
    			attr_dev(h32, "class", "svelte-tvybwj");
    			add_location(h32, file$4, 183, 3, 4871);
    			add_location(br23, file$4, 186, 146, 5057);
    			add_location(br24, file$4, 187, 129, 5192);
    			add_location(br25, file$4, 188, 3, 5201);
    			add_location(br26, file$4, 189, 124, 5331);
    			add_location(br27, file$4, 190, 74, 5411);
    			attr_dev(a6, "class", "realLink svelte-tvybwj");
    			attr_dev(a6, "href", "https://pfcalc.heliodex.cf/");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "rel", "noopener noreferrer");
    			add_location(a6, file$4, 191, 34, 5451);
    			add_location(br28, file$4, 191, 155, 5572);
    			attr_dev(a7, "class", "realLink svelte-tvybwj");
    			attr_dev(a7, "href", "https://oldpfcalc.heliodex.cf/");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "rel", "noopener noreferrer");
    			add_location(a7, file$4, 192, 36, 5614);
    			add_location(br29, file$4, 192, 163, 5741);
    			add_location(br30, file$4, 193, 3, 5750);
    			if (!src_url_equal(img2.src, img2_src_value = "/images/pfcalc.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Screenshot of the calculator page");
    			attr_dev(img2, "width", "300");
    			add_location(img2, file$4, 195, 3, 5761);
    			attr_dev(p3, "class", "svelte-tvybwj");
    			add_location(p3, file$4, 185, 3, 4906);
    			attr_dev(div2, "class", "project svelte-tvybwj");
    			add_location(div2, file$4, 182, 2, 4844);
    			attr_dev(h33, "class", "svelte-tvybwj");
    			add_location(h33, file$4, 202, 3, 5901);
    			add_location(br31, file$4, 205, 126, 6066);
    			add_location(br32, file$4, 206, 134, 6206);
    			add_location(br33, file$4, 207, 81, 6293);
    			add_location(br34, file$4, 208, 3, 6302);
    			attr_dev(a8, "class", "realLink svelte-tvybwj");
    			attr_dev(a8, "href", "https://www.tomscott.com/usvsth3m/maths/");
    			attr_dev(a8, "target", "_blank");
    			attr_dev(a8, "rel", "noopener noreferrer");
    			add_location(a8, file$4, 209, 63, 6371);
    			add_location(br35, file$4, 209, 230, 6538);
    			add_location(br36, file$4, 210, 3, 6547);
    			attr_dev(a9, "class", "realLink svelte-tvybwj");
    			attr_dev(a9, "href", "https://www.roblox.com/games/7557207546/");
    			attr_dev(a9, "target", "_blank");
    			attr_dev(a9, "rel", "noopener noreferrer");
    			add_location(a9, file$4, 211, 37, 6590);
    			add_location(br37, file$4, 211, 180, 6733);
    			add_location(br38, file$4, 212, 3, 6742);
    			if (!src_url_equal(img3.src, img3_src_value = "/images/crazycalc.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Screenshot of the game");
    			attr_dev(img3, "width", "300");
    			add_location(img3, file$4, 214, 3, 6753);
    			attr_dev(p4, "class", "svelte-tvybwj");
    			add_location(p4, file$4, 204, 3, 5935);
    			attr_dev(div3, "class", "project svelte-tvybwj");
    			add_location(div3, file$4, 200, 2, 5870);
    			attr_dev(h34, "class", "svelte-tvybwj");
    			add_location(h34, file$4, 220, 3, 6882);
    			add_location(br39, file$4, 223, 114, 7045);
    			add_location(br40, file$4, 224, 130, 7181);
    			add_location(br41, file$4, 225, 3, 7190);
    			add_location(em, file$4, 226, 82, 7278);
    			add_location(br42, file$4, 226, 199, 7395);
    			attr_dev(a10, "class", "realLink svelte-tvybwj");
    			attr_dev(a10, "href", "https://github.com/Heliodex/PythonCalculators/");
    			attr_dev(a10, "target", "_blank");
    			attr_dev(a10, "rel", "noopener noreferrer");
    			add_location(a10, file$4, 227, 25, 7426);
    			add_location(br43, file$4, 227, 184, 7585);
    			attr_dev(p5, "class", "svelte-tvybwj");
    			add_location(p5, file$4, 222, 3, 6926);
    			attr_dev(div4, "class", "project svelte-tvybwj");
    			add_location(div4, file$4, 219, 2, 6856);
    			attr_dev(div5, "class", "projects svelte-tvybwj");
    			add_location(div5, file$4, 140, 1, 2391);
    			attr_dev(div6, "class", "main svelte-tvybwj");
    			add_location(div6, file$4, 132, 0, 2222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sidenav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h1);
    			append_dev(div6, t2);
    			append_dev(div6, br0);
    			append_dev(div6, t3);
    			append_dev(div6, p0);
    			append_dev(p0, t4);
    			append_dev(p0, br1);
    			append_dev(div6, t5);
    			append_dev(div6, br2);
    			append_dev(div6, t6);
    			append_dev(div6, br3);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t9);
    			append_dev(div0, p1);
    			append_dev(p1, t10);
    			append_dev(p1, br4);
    			append_dev(p1, t11);
    			append_dev(p1, br5);
    			append_dev(p1, t12);
    			append_dev(p1, a0);
    			append_dev(p1, t14);
    			append_dev(p1, br6);
    			append_dev(p1, t15);
    			append_dev(p1, br7);
    			append_dev(p1, t16);
    			append_dev(p1, br8);
    			append_dev(p1, t17);
    			append_dev(p1, a1);
    			append_dev(p1, br9);
    			append_dev(p1, t19);
    			append_dev(p1, a2);
    			append_dev(p1, br10);
    			append_dev(p1, t21);
    			append_dev(p1, br11);
    			append_dev(p1, t22);
    			append_dev(p1, img0);
    			append_dev(div5, t23);
    			append_dev(div5, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t25);
    			append_dev(div1, p2);
    			append_dev(p2, t26);
    			append_dev(p2, br12);
    			append_dev(p2, t27);
    			append_dev(p2, br13);
    			append_dev(p2, t28);
    			append_dev(p2, br14);
    			append_dev(p2, t29);
    			append_dev(p2, a3);
    			append_dev(p2, t31);
    			append_dev(p2, br15);
    			append_dev(p2, t32);
    			append_dev(p2, br16);
    			append_dev(p2, t33);
    			append_dev(p2, br17);
    			append_dev(p2, t34);
    			append_dev(p2, br18);
    			append_dev(p2, t35);
    			append_dev(p2, br19);
    			append_dev(p2, t36);
    			append_dev(p2, a4);
    			append_dev(p2, t38);
    			append_dev(p2, br20);
    			append_dev(p2, t39);
    			append_dev(p2, a5);
    			append_dev(p2, br21);
    			append_dev(p2, t41);
    			append_dev(p2, br22);
    			append_dev(p2, t42);
    			append_dev(p2, img1);
    			append_dev(div5, t43);
    			append_dev(div5, div2);
    			append_dev(div2, h32);
    			append_dev(div2, t45);
    			append_dev(div2, p3);
    			append_dev(p3, t46);
    			append_dev(p3, br23);
    			append_dev(p3, t47);
    			append_dev(p3, br24);
    			append_dev(p3, t48);
    			append_dev(p3, br25);
    			append_dev(p3, t49);
    			append_dev(p3, br26);
    			append_dev(p3, t50);
    			append_dev(p3, br27);
    			append_dev(p3, t51);
    			append_dev(p3, a6);
    			append_dev(p3, t53);
    			append_dev(p3, br28);
    			append_dev(p3, t54);
    			append_dev(p3, a7);
    			append_dev(p3, t56);
    			append_dev(p3, br29);
    			append_dev(p3, t57);
    			append_dev(p3, br30);
    			append_dev(p3, t58);
    			append_dev(p3, img2);
    			append_dev(div5, t59);
    			append_dev(div5, div3);
    			append_dev(div3, h33);
    			append_dev(div3, t61);
    			append_dev(div3, p4);
    			append_dev(p4, t62);
    			append_dev(p4, br31);
    			append_dev(p4, t63);
    			append_dev(p4, br32);
    			append_dev(p4, t64);
    			append_dev(p4, br33);
    			append_dev(p4, t65);
    			append_dev(p4, br34);
    			append_dev(p4, t66);
    			append_dev(p4, a8);
    			append_dev(p4, t68);
    			append_dev(p4, br35);
    			append_dev(p4, t69);
    			append_dev(p4, br36);
    			append_dev(p4, t70);
    			append_dev(p4, a9);
    			append_dev(p4, t72);
    			append_dev(p4, br37);
    			append_dev(p4, t73);
    			append_dev(p4, br38);
    			append_dev(p4, t74);
    			append_dev(p4, img3);
    			append_dev(div5, t75);
    			append_dev(div5, div4);
    			append_dev(div4, h34);
    			append_dev(div4, t77);
    			append_dev(div4, p5);
    			append_dev(p5, t78);
    			append_dev(p5, br39);
    			append_dev(p5, t79);
    			append_dev(p5, br40);
    			append_dev(p5, t80);
    			append_dev(p5, br41);
    			append_dev(p5, t81);
    			append_dev(p5, em);
    			append_dev(p5, t83);
    			append_dev(p5, br42);
    			append_dev(p5, t84);
    			append_dev(p5, a10);
    			append_dev(p5, t86);
    			append_dev(p5, br43);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidenav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sidenav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sidenav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Projects', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, Sidenav });
    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/About.svelte generated by Svelte v3.45.0 */
    const file$3 = "src/components/About.svelte";

    function create_fragment$3(ctx) {
    	let sidenav;
    	let t0;
    	let div;
    	let h1;
    	let t2;
    	let br0;
    	let t3;
    	let p0;
    	let br1;
    	let t5;
    	let p1;
    	let p2;
    	let p3;
    	let p4;
    	let p5;
    	let br2;
    	let t11;
    	let p6;
    	let t12;
    	let br3;
    	let t13;
    	let current;
    	sidenav = new Sidenav({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sidenav.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "About";
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Heliodex";
    			br1 = element("br");
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "/'hiliə";
    			p2 = element("p");
    			p2.textContent = "ʊ";
    			p3 = element("p");
    			p3.textContent = "d";
    			p4 = element("p");
    			p4.textContent = "ɛ";
    			p5 = element("p");
    			p5.textContent = "ks/";
    			br2 = element("br");
    			t11 = space();
    			p6 = element("p");
    			t12 = text("text go here");
    			br3 = element("br");
    			t13 = text("\r\n\ttodo: about page");
    			attr_dev(h1, "class", "svelte-tvybwj");
    			add_location(h1, file$3, 133, 1, 2243);
    			add_location(br0, file$3, 134, 1, 2260);
    			attr_dev(p0, "class", "svelte-tvybwj");
    			add_location(p0, file$3, 136, 1, 2269);
    			add_location(br1, file$3, 136, 16, 2284);
    			attr_dev(p1, "class", "svelte-tvybwj");
    			add_location(p1, file$3, 137, 1, 2291);
    			attr_dev(p2, "class", "ipa svelte-tvybwj");
    			add_location(p2, file$3, 137, 15, 2305);
    			attr_dev(p3, "class", "svelte-tvybwj");
    			add_location(p3, file$3, 137, 35, 2325);
    			attr_dev(p4, "class", "ipa svelte-tvybwj");
    			add_location(p4, file$3, 137, 43, 2333);
    			attr_dev(p5, "class", "svelte-tvybwj");
    			add_location(p5, file$3, 137, 63, 2353);
    			add_location(br2, file$3, 137, 73, 2363);
    			add_location(br3, file$3, 141, 13, 2506);
    			attr_dev(p6, "class", "svelte-tvybwj");
    			add_location(p6, file$3, 140, 1, 2488);
    			attr_dev(div, "class", "main svelte-tvybwj");
    			add_location(div, file$3, 132, 0, 2222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sidenav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, br0);
    			append_dev(div, t3);
    			append_dev(div, p0);
    			append_dev(div, br1);
    			append_dev(div, t5);
    			append_dev(div, p1);
    			append_dev(div, p2);
    			append_dev(div, p3);
    			append_dev(div, p4);
    			append_dev(div, p5);
    			append_dev(div, br2);
    			append_dev(div, t11);
    			append_dev(div, p6);
    			append_dev(p6, t12);
    			append_dev(p6, br3);
    			append_dev(p6, t13);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidenav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sidenav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sidenav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('About', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, Sidenav });
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Contact.svelte generated by Svelte v3.45.0 */
    const file$2 = "src/components/Contact.svelte";

    function create_fragment$2(ctx) {
    	let sidenav;
    	let t0;
    	let div;
    	let h1;
    	let t2;
    	let br0;
    	let t3;
    	let p;
    	let t4;
    	let br1;
    	let br2;
    	let t5;
    	let a0;
    	let br3;
    	let t7;
    	let a1;
    	let br4;
    	let t9;
    	let a2;
    	let br5;
    	let t11;
    	let a3;
    	let br6;
    	let t13;
    	let a4;
    	let br7;
    	let t15;
    	let a5;
    	let br8;
    	let t17;
    	let a6;
    	let br9;
    	let t19;
    	let br10;
    	let t20;
    	let a7;
    	let br11;
    	let current;
    	sidenav = new Sidenav({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sidenav.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Contact";
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			p = element("p");
    			t4 = text("Here's a list of a few of the websites/media that you are able to contact me via.");
    			br1 = element("br");
    			br2 = element("br");
    			t5 = text("\r\n\tGithub: @Heliodex, ");
    			a0 = element("a");
    			a0.textContent = "GitHub.com/Heliodex";
    			br3 = element("br");
    			t7 = text("\r\n\tTwitter: @lwinklly, ");
    			a1 = element("a");
    			a1.textContent = "Twitter.com/lwinklly";
    			br4 = element("br");
    			t9 = text("\r\n\tReddit: u/Heliodex, ");
    			a2 = element("a");
    			a2.textContent = "Reddit.com/u/Heliodex";
    			br5 = element("br");
    			t11 = text("\r\n\tDeveloper Forum: Lewin4, ");
    			a3 = element("a");
    			a3.textContent = "Devforum.Roblox.com/u/lewin4";
    			br6 = element("br");
    			t13 = text("\r\n\tRoblox: @Lewin4, ");
    			a4 = element("a");
    			a4.textContent = "Roblox.com/users/77663253/profile";
    			br7 = element("br");
    			t15 = text("\r\n\tYoutube: @Heliodex, ");
    			a5 = element("a");
    			a5.textContent = "YouTube.com/channel/UC8E2hw963cW5IJXZnBE6_vg";
    			br8 = element("br");
    			t17 = text("\r\n\tDiscord: Heliodex#3590, ");
    			a6 = element("a");
    			a6.textContent = "Discord.com/users/290622468547411968";
    			br9 = element("br");
    			t19 = text("\r\n\tTelegram: @Heliodex");
    			br10 = element("br");
    			t20 = text("\r\n\tEmail: Heli@odex.cf, ");
    			a7 = element("a");
    			a7.textContent = "Heli@odex.cf";
    			br11 = element("br");
    			attr_dev(h1, "class", "svelte-tvybwj");
    			add_location(h1, file$2, 133, 1, 2243);
    			add_location(br0, file$2, 134, 1, 2262);
    			add_location(br1, file$2, 137, 82, 2359);
    			add_location(br2, file$2, 137, 86, 2363);
    			attr_dev(a0, "class", "realLink svelte-tvybwj");
    			attr_dev(a0, "href", "https://github.com/Heliodex/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$2, 138, 20, 2389);
    			add_location(br3, file$2, 138, 141, 2510);
    			attr_dev(a1, "class", "realLink svelte-tvybwj");
    			attr_dev(a1, "href", "https://twitter.com/lwinklly/");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$2, 139, 21, 2537);
    			add_location(br4, file$2, 139, 144, 2660);
    			attr_dev(a2, "class", "realLink svelte-tvybwj");
    			attr_dev(a2, "href", "https://www.reddit.com/user/Heliodex/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noopener noreferrer");
    			add_location(a2, file$2, 140, 21, 2687);
    			add_location(br5, file$2, 140, 153, 2819);
    			attr_dev(a3, "class", "realLink svelte-tvybwj");
    			attr_dev(a3, "href", "https://devforum.roblox.com/u/lewin4/summary/");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "rel", "noopener noreferrer");
    			add_location(a3, file$2, 141, 26, 2851);
    			add_location(br6, file$2, 141, 173, 2998);
    			attr_dev(a4, "class", "realLink svelte-tvybwj");
    			attr_dev(a4, "href", "https://www.roblox.com/users/77663253/profile/");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "rel", "noopener noreferrer");
    			add_location(a4, file$2, 142, 18, 3022);
    			add_location(br7, file$2, 142, 171, 3175);
    			attr_dev(a5, "class", "realLink svelte-tvybwj");
    			attr_dev(a5, "href", "https://www.youtube.com/channel/UC8E2hw963cW5IJXZnBE6_vg/");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "rel", "noopener noreferrer");
    			add_location(a5, file$2, 143, 21, 3202);
    			add_location(br8, file$2, 143, 196, 3377);
    			attr_dev(a6, "class", "realLink svelte-tvybwj");
    			attr_dev(a6, "href", "https://discord.com/users/290622468547411968");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "rel", "noopener noreferrer");
    			add_location(a6, file$2, 144, 25, 3408);
    			add_location(br9, file$2, 144, 179, 3562);
    			add_location(br10, file$2, 145, 20, 3588);
    			attr_dev(a7, "class", "realLink svelte-tvybwj");
    			attr_dev(a7, "href", "mailto:Heli@odex.cf");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "rel", "noopener noreferrer");
    			add_location(a7, file$2, 146, 22, 3616);
    			add_location(br11, file$2, 146, 127, 3721);
    			attr_dev(p, "class", "svelte-tvybwj");
    			add_location(p, file$2, 136, 1, 2272);
    			attr_dev(div, "class", "main svelte-tvybwj");
    			add_location(div, file$2, 132, 0, 2222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(sidenav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, br0);
    			append_dev(div, t3);
    			append_dev(div, p);
    			append_dev(p, t4);
    			append_dev(p, br1);
    			append_dev(p, br2);
    			append_dev(p, t5);
    			append_dev(p, a0);
    			append_dev(p, br3);
    			append_dev(p, t7);
    			append_dev(p, a1);
    			append_dev(p, br4);
    			append_dev(p, t9);
    			append_dev(p, a2);
    			append_dev(p, br5);
    			append_dev(p, t11);
    			append_dev(p, a3);
    			append_dev(p, br6);
    			append_dev(p, t13);
    			append_dev(p, a4);
    			append_dev(p, br7);
    			append_dev(p, t15);
    			append_dev(p, a5);
    			append_dev(p, br8);
    			append_dev(p, t17);
    			append_dev(p, a6);
    			append_dev(p, br9);
    			append_dev(p, t19);
    			append_dev(p, br10);
    			append_dev(p, t20);
    			append_dev(p, a7);
    			append_dev(p, br11);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidenav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sidenav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sidenav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, Sidenav });
    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/routes/index.svelte generated by Svelte v3.45.0 */
    const file$1 = "src/routes/index.svelte";

    // (11:0) <Router {url}>
    function create_default_slot(ctx) {
    	let div;
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let t2;
    	let route3;
    	let current;

    	route0 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "projects", component: Projects },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "about", component: About },
    			$$inline: true
    		});

    	route3 = new Route({
    			props: { path: "contact", component: Contact },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			t2 = space();
    			create_component(route3.$$.fragment);
    			add_location(div, file$1, 11, 1, 323);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(route0, div, null);
    			append_dev(div, t0);
    			mount_component(route1, div, null);
    			append_dev(div, t1);
    			mount_component(route2, div, null);
    			append_dev(div, t2);
    			mount_component(route3, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    			destroy_component(route3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(11:0) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Routes', slots, []);
    	let { url = "" } = $$props;
    	const writable_props = ['url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Routes> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({
    		Router,
    		Route,
    		Home,
    		Projects,
    		About,
    		Contact,
    		url
    	});

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class Routes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Routes",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get url() {
    		throw new Error("<Routes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Routes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.45.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let router;
    	let current;
    	router = new Routes({ $$inline: true });

    	const block = {
    		c: function create() {
    			body = element("body");
    			create_component(router.$$.fragment);
    			attr_dev(body, "class", "svelte-tvybwj");
    			add_location(body, file, 129, 0, 2170);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			mount_component(router, body, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router: Routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
        target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
