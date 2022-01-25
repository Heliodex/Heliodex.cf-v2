
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
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

    /* src/components/Home.svelte generated by Svelte v3.46.2 */

    const file$4 = "src/components/Home.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let br0;
    	let t2;
    	let br1;
    	let t3;
    	let br2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Heliodex.cf";
    			t1 = space();
    			p = element("p");
    			br0 = element("br");
    			t2 = text("\r\n\tWelcome to Heliodex.cf!");
    			br1 = element("br");
    			t3 = text("\r\n\tThis is my portfolio page where you can see the projects that I've worked on, the teams that I've worked in, and how to contact me.");
    			br2 = element("br");
    			attr_dev(h1, "class", "svelte-1forcre");
    			add_location(h1, file$4, 125, 1, 2117);
    			add_location(br0, file$4, 127, 1, 2146);
    			add_location(br1, file$4, 128, 24, 2176);
    			add_location(br2, file$4, 129, 132, 2314);
    			attr_dev(p, "class", "svelte-1forcre");
    			add_location(p, file$4, 126, 1, 2140);
    			attr_dev(div, "class", "main svelte-1forcre");
    			add_location(div, file$4, 124, 0, 2096);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, br0);
    			append_dev(p, t2);
    			append_dev(p, br1);
    			append_dev(p, t3);
    			append_dev(p, br2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Projects.svelte generated by Svelte v3.46.2 */

    const file$3 = "src/components/Projects.svelte";

    function create_fragment$3(ctx) {
    	let div6;
    	let h1;
    	let t1;
    	let br0;
    	let t2;
    	let p0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let t5;
    	let br3;
    	let t6;
    	let div5;
    	let div0;
    	let h30;
    	let t8;
    	let p1;
    	let t9;
    	let br4;
    	let t10;
    	let br5;
    	let t11;
    	let a0;
    	let t13;
    	let br6;
    	let t14;
    	let br7;
    	let t15;
    	let br8;
    	let t16;
    	let a1;
    	let br9;
    	let t18;
    	let a2;
    	let br10;
    	let t20;
    	let br11;
    	let t21;
    	let img0;
    	let img0_src_value;
    	let t22;
    	let div1;
    	let h31;
    	let t24;
    	let p2;
    	let t25;
    	let br12;
    	let t26;
    	let br13;
    	let t27;
    	let br14;
    	let t28;
    	let a3;
    	let t30;
    	let br15;
    	let t31;
    	let br16;
    	let t32;
    	let br17;
    	let t33;
    	let br18;
    	let t34;
    	let br19;
    	let t35;
    	let a4;
    	let t37;
    	let br20;
    	let t38;
    	let a5;
    	let br21;
    	let t40;
    	let br22;
    	let t41;
    	let img1;
    	let img1_src_value;
    	let t42;
    	let div2;
    	let h32;
    	let t44;
    	let p3;
    	let t45;
    	let br23;
    	let t46;
    	let br24;
    	let t47;
    	let br25;
    	let t48;
    	let br26;
    	let t49;
    	let br27;
    	let t50;
    	let a6;
    	let t52;
    	let br28;
    	let t53;
    	let a7;
    	let t55;
    	let br29;
    	let t56;
    	let br30;
    	let t57;
    	let img2;
    	let img2_src_value;
    	let t58;
    	let div3;
    	let h33;
    	let t60;
    	let p4;
    	let t61;
    	let br31;
    	let t62;
    	let br32;
    	let t63;
    	let br33;
    	let t64;
    	let br34;
    	let t65;
    	let a8;
    	let t67;
    	let br35;
    	let t68;
    	let br36;
    	let t69;
    	let a9;
    	let t71;
    	let br37;
    	let t72;
    	let br38;
    	let t73;
    	let img3;
    	let img3_src_value;
    	let t74;
    	let div4;
    	let h34;
    	let t76;
    	let p5;
    	let t77;
    	let br39;
    	let t78;
    	let br40;
    	let t79;
    	let br41;
    	let t80;
    	let em;
    	let t82;
    	let br42;
    	let t83;
    	let a10;
    	let t85;
    	let br43;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Projects";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			p0 = element("p");
    			t3 = text("Here's a list of all the projects that I have worked on, or the teams I have worked in.");
    			br1 = element("br");
    			t4 = space();
    			br2 = element("br");
    			t5 = space();
    			br3 = element("br");
    			t6 = space();
    			div5 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "DocSocial";
    			t8 = space();
    			p1 = element("p");
    			t9 = text("Docsocial is a free, secure messaging application. It is designed to appear like a Google document from a quick glance, or from a look at your browser history.");
    			br4 = element("br");
    			t10 = space();
    			br5 = element("br");
    			t11 = text("\r\n\t\t\tDocSocial uses ");
    			a0 = element("a");
    			a0.textContent = "Scaledrone";
    			t13 = text(" for its backend and for transferring messages.");
    			br6 = element("br");
    			t14 = space();
    			br7 = element("br");
    			t15 = text("\r\n\t\t\tIt was designed to work best with one specific device and OS, our school-assigned chromebooks, so pupils could chat with others in class and not be caught by a teacher.");
    			br8 = element("br");
    			t16 = space();
    			a1 = element("a");
    			a1.textContent = "DocSocial.tk";
    			br9 = element("br");
    			t18 = space();
    			a2 = element("a");
    			a2.textContent = "DocSocial.cf";
    			br10 = element("br");
    			t20 = space();
    			br11 = element("br");
    			t21 = space();
    			img0 = element("img");
    			t22 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "HybridOS";
    			t24 = space();
    			p2 = element("p");
    			t25 = text("HybridOS was an open-source Python3 'meta-program'.");
    			br12 = element("br");
    			t26 = text("\r\n\t\t\tI avoid calling it an operating system, because... it's not an operating system, it was written in Python.");
    			br13 = element("br");
    			t27 = space();
    			br14 = element("br");
    			t28 = text("\r\n\t\t\tHybridOS was worked on from mid- to late-2019 as a fusion of two similar programs, BlakBird by me, and Vortex by Taskmanager. (");
    			a3 = element("a");
    			a3.textContent = "taski.ml";
    			t30 = text(")");
    			br15 = element("br");
    			t31 = text("\r\n\t\t\tThe program has a total line count of more than 1,100, and had features such as a multi-user signup and login system, a number of games and useful applications, plenty of colourful ASCII art, and a root admin system.");
    			br16 = element("br");
    			t32 = text("\r\n\t\t\tHybridOS was ported to many different languages, including C, C++, Java, C# (twice), and Batch. Even linux distros were made as well!");
    			br17 = element("br");
    			t33 = space();
    			br18 = element("br");
    			t34 = text("\r\n\t\t\tHybridOS was largely abandoned after the beginning of 2020, and the code for the first Python version has been released under The Unlicense on my GitHub page.");
    			br19 = element("br");
    			t35 = space();
    			a4 = element("a");
    			a4.textContent = "Github.com/Heliodex/HybridOS";
    			t37 = space();
    			br20 = element("br");
    			t38 = space();
    			a5 = element("a");
    			a5.textContent = "Something big may be coming soon, though...";
    			br21 = element("br");
    			t40 = space();
    			br22 = element("br");
    			t41 = space();
    			img1 = element("img");
    			t42 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "PF Range Calculator";
    			t44 = space();
    			p3 = element("p");
    			t45 = text("This is a small web tool designed to calculate how far weapons in the game Phantom Forces by StyLiS Studios deal a certain amount of damage to.");
    			br23 = element("br");
    			t46 = text("\r\n\t\t\tYou can input some values provided by the in-game statistics, and the tool will calculate how far it will deal that damage to.");
    			br24 = element("br");
    			t47 = space();
    			br25 = element("br");
    			t48 = text("\r\n\t\t\tThis was created by me in a few days, after I realised how long it would take to calculate all the range values manually.");
    			br26 = element("br");
    			t49 = text("\r\n\t\t\tI remade the site a few months later, being my first time using Svelte.");
    			br27 = element("br");
    			t50 = text("\r\n\t\t\tYou can find the calculator at ");
    			a6 = element("a");
    			a6.textContent = "PFCalc.Heliodex.cf";
    			t52 = text(" .");
    			br28 = element("br");
    			t53 = text("\r\n\t\t\tThe older version can be seen at ");
    			a7 = element("a");
    			a7.textContent = "OldPFCalc.Heliodex.cf";
    			t55 = text(" .");
    			br29 = element("br");
    			t56 = space();
    			br30 = element("br");
    			t57 = space();
    			img2 = element("img");
    			t58 = space();
    			div3 = element("div");
    			h33 = element("h3");
    			h33.textContent = "Crazy Calculations";
    			t60 = space();
    			p4 = element("p");
    			t61 = text("Crazy Calculations was a simple maths game that would test you through 10 levels of increasingly difficult maths questions.");
    			br31 = element("br");
    			t62 = text("\r\n\t\t\tIt was programmed in about a week for a Computer Science class assignment, where a video had to be recorded explaining the project.");
    			br32 = element("br");
    			t63 = text("\r\n\t\t\tThe project was started on 23 September 2021, and submitted on 4 October 2021.");
    			br33 = element("br");
    			t64 = space();
    			br34 = element("br");
    			t65 = text("\r\n\t\t\tThe game was inspired by (and much of the code ported from) ");
    			a8 = element("a");
    			a8.textContent = "You Can't Do Simple Maths Under Pressure";
    			t67 = text(" by UsVsTh3m.");
    			br35 = element("br");
    			t68 = space();
    			br36 = element("br");
    			t69 = text("\r\n\t\t\tCrazy Calculations is playable at ");
    			a9 = element("a");
    			a9.textContent = "Roblox.com/games/7557207546";
    			t71 = text(" .");
    			br37 = element("br");
    			t72 = space();
    			br38 = element("br");
    			t73 = space();
    			img3 = element("img");
    			t74 = space();
    			div4 = element("div");
    			h34 = element("h3");
    			h34.textContent = "Python Calculator Collection";
    			t76 = space();
    			p5 = element("p");
    			t77 = text("This is a collection of calculator programs I wrote on my calculator's python interpreter during maths classes.");
    			br39 = element("br");
    			t78 = text("\r\n\t\t\tThere are programs for calculating interest over time, areas or volumes of polytopes, angles of arcs of circles, and much more.");
    			br40 = element("br");
    			t79 = space();
    			br41 = element("br");
    			t80 = text("\r\n\t\t\tI cannot and will not guarantee the accuracy of these programs, but while they ");
    			em = element("em");
    			em.textContent = "should";
    			t82 = text(" be decently accurate, please submit an issue to the repo if you find an error in any of the programs.");
    			br42 = element("br");
    			t83 = text("\r\n\t\t\tThey are available at ");
    			a10 = element("a");
    			a10.textContent = "GitHub.com/Heliodex/PythonCalculators";
    			t85 = text(" .");
    			br43 = element("br");
    			attr_dev(h1, "class", "svelte-1forcre");
    			add_location(h1, file$3, 125, 1, 2117);
    			add_location(br0, file$3, 126, 1, 2137);
    			add_location(br1, file$3, 128, 88, 2237);
    			attr_dev(p0, "class", "svelte-1forcre");
    			add_location(p0, file$3, 127, 1, 2144);
    			add_location(br2, file$3, 130, 1, 2251);
    			add_location(br3, file$3, 131, 1, 2258);
    			attr_dev(h30, "class", "svelte-1forcre");
    			add_location(h30, file$3, 134, 3, 2317);
    			add_location(br4, file$3, 137, 162, 2509);
    			add_location(br5, file$3, 138, 3, 2518);
    			attr_dev(a0, "class", "realLink svelte-1forcre");
    			attr_dev(a0, "href", "https://Scaledrone.com/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$3, 139, 18, 2542);
    			add_location(br6, file$3, 139, 172, 2696);
    			add_location(br7, file$3, 140, 3, 2705);
    			add_location(br8, file$3, 141, 171, 2882);
    			attr_dev(a1, "class", "realLink svelte-1forcre");
    			attr_dev(a1, "href", "https://docsocial.tk/");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$3, 142, 3, 2891);
    			add_location(br9, file$3, 142, 110, 2998);
    			attr_dev(a2, "class", "realLink svelte-1forcre");
    			attr_dev(a2, "href", "https://docsocial.cf/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noopener noreferrer");
    			add_location(a2, file$3, 143, 3, 3007);
    			add_location(br10, file$3, 143, 110, 3114);
    			add_location(br11, file$3, 144, 3, 3123);
    			if (!src_url_equal(img0.src, img0_src_value = "/images/docsocial.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "DocSocial Logo");
    			attr_dev(img0, "width", "300");
    			add_location(img0, file$3, 147, 3, 3136);
    			attr_dev(p1, "class", "svelte-1forcre");
    			add_location(p1, file$3, 136, 3, 2342);
    			attr_dev(div0, "class", "project svelte-1forcre");
    			add_location(div0, file$3, 133, 2, 2291);
    			attr_dev(h31, "class", "svelte-1forcre");
    			add_location(h31, file$3, 153, 3, 3258);
    			add_location(br12, file$3, 156, 54, 3341);
    			add_location(br13, file$3, 157, 109, 3456);
    			add_location(br14, file$3, 158, 3, 3465);
    			attr_dev(a3, "class", "realLink svelte-1forcre");
    			attr_dev(a3, "href", "https://taski.ml/");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "rel", "noopener noreferrer");
    			add_location(a3, file$3, 159, 130, 3601);
    			add_location(br15, file$3, 159, 230, 3701);
    			add_location(br16, file$3, 160, 219, 3926);
    			add_location(br17, file$3, 161, 136, 4068);
    			add_location(br18, file$3, 162, 3, 4077);
    			add_location(br19, file$3, 163, 161, 4244);
    			attr_dev(a4, "class", "realLink svelte-1forcre");
    			attr_dev(a4, "href", "https://github.com/HelioDex/HybridOS/");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "rel", "noopener noreferrer");
    			add_location(a4, file$3, 164, 3, 4253);
    			add_location(br20, file$3, 165, 3, 4397);
    			attr_dev(a5, "class", "realLink svelte-1forcre");
    			attr_dev(a5, "href", "https://www.youtube.com/watch?v=QwhaqpOL310/");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "rel", "noopener noreferrer");
    			add_location(a5, file$3, 166, 3, 4406);
    			add_location(br21, file$3, 166, 164, 4567);
    			add_location(br22, file$3, 167, 3, 4576);
    			if (!src_url_equal(img1.src, img1_src_value = "/images/hylogos.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "6 different HybridOS Logos throughout the versions");
    			attr_dev(img1, "width", "300");
    			add_location(img1, file$3, 168, 4, 4586);
    			attr_dev(p2, "class", "svelte-1forcre");
    			add_location(p2, file$3, 155, 3, 3282);
    			attr_dev(div1, "class", "project svelte-1forcre");
    			add_location(div1, file$3, 151, 2, 3227);
    			attr_dev(h32, "class", "svelte-1forcre");
    			add_location(h32, file$3, 175, 3, 4745);
    			add_location(br23, file$3, 178, 146, 4931);
    			add_location(br24, file$3, 179, 129, 5066);
    			add_location(br25, file$3, 180, 3, 5075);
    			add_location(br26, file$3, 181, 124, 5205);
    			add_location(br27, file$3, 182, 74, 5285);
    			attr_dev(a6, "class", "realLink svelte-1forcre");
    			attr_dev(a6, "href", "https://pfcalc.heliodex.cf/");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "rel", "noopener noreferrer");
    			add_location(a6, file$3, 183, 34, 5325);
    			add_location(br28, file$3, 183, 155, 5446);
    			attr_dev(a7, "class", "realLink svelte-1forcre");
    			attr_dev(a7, "href", "https://oldpfcalc.heliodex.cf/");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "rel", "noopener noreferrer");
    			add_location(a7, file$3, 184, 36, 5488);
    			add_location(br29, file$3, 184, 163, 5615);
    			add_location(br30, file$3, 185, 3, 5624);
    			if (!src_url_equal(img2.src, img2_src_value = "/images/pfcalc.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Screenshot of the calculator page");
    			attr_dev(img2, "width", "300");
    			add_location(img2, file$3, 187, 3, 5635);
    			attr_dev(p3, "class", "svelte-1forcre");
    			add_location(p3, file$3, 177, 3, 4780);
    			attr_dev(div2, "class", "project svelte-1forcre");
    			add_location(div2, file$3, 174, 2, 4718);
    			attr_dev(h33, "class", "svelte-1forcre");
    			add_location(h33, file$3, 194, 3, 5775);
    			add_location(br31, file$3, 197, 126, 5940);
    			add_location(br32, file$3, 198, 134, 6080);
    			add_location(br33, file$3, 199, 81, 6167);
    			add_location(br34, file$3, 200, 3, 6176);
    			attr_dev(a8, "class", "realLink svelte-1forcre");
    			attr_dev(a8, "href", "https://www.tomscott.com/usvsth3m/maths/");
    			attr_dev(a8, "target", "_blank");
    			attr_dev(a8, "rel", "noopener noreferrer");
    			add_location(a8, file$3, 201, 63, 6245);
    			add_location(br35, file$3, 201, 230, 6412);
    			add_location(br36, file$3, 202, 3, 6421);
    			attr_dev(a9, "class", "realLink svelte-1forcre");
    			attr_dev(a9, "href", "https://www.roblox.com/games/7557207546/");
    			attr_dev(a9, "target", "_blank");
    			attr_dev(a9, "rel", "noopener noreferrer");
    			add_location(a9, file$3, 203, 37, 6464);
    			add_location(br37, file$3, 203, 180, 6607);
    			add_location(br38, file$3, 204, 3, 6616);
    			if (!src_url_equal(img3.src, img3_src_value = "/images/crazycalc.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Screenshot of the game");
    			attr_dev(img3, "width", "300");
    			add_location(img3, file$3, 206, 3, 6627);
    			attr_dev(p4, "class", "svelte-1forcre");
    			add_location(p4, file$3, 196, 3, 5809);
    			attr_dev(div3, "class", "project svelte-1forcre");
    			add_location(div3, file$3, 192, 2, 5744);
    			attr_dev(h34, "class", "svelte-1forcre");
    			add_location(h34, file$3, 212, 3, 6756);
    			add_location(br39, file$3, 215, 114, 6919);
    			add_location(br40, file$3, 216, 130, 7055);
    			add_location(br41, file$3, 217, 3, 7064);
    			add_location(em, file$3, 218, 82, 7152);
    			add_location(br42, file$3, 218, 199, 7269);
    			attr_dev(a10, "class", "realLink svelte-1forcre");
    			attr_dev(a10, "href", "https://github.com/Heliodex/PythonCalculators/");
    			attr_dev(a10, "target", "_blank");
    			attr_dev(a10, "rel", "noopener noreferrer");
    			add_location(a10, file$3, 219, 25, 7300);
    			add_location(br43, file$3, 219, 184, 7459);
    			attr_dev(p5, "class", "svelte-1forcre");
    			add_location(p5, file$3, 214, 3, 6800);
    			attr_dev(div4, "class", "project svelte-1forcre");
    			add_location(div4, file$3, 211, 2, 6730);
    			attr_dev(div5, "class", "projects svelte-1forcre");
    			add_location(div5, file$3, 132, 1, 2265);
    			attr_dev(div6, "class", "main svelte-1forcre");
    			add_location(div6, file$3, 124, 0, 2096);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h1);
    			append_dev(div6, t1);
    			append_dev(div6, br0);
    			append_dev(div6, t2);
    			append_dev(div6, p0);
    			append_dev(p0, t3);
    			append_dev(p0, br1);
    			append_dev(div6, t4);
    			append_dev(div6, br2);
    			append_dev(div6, t5);
    			append_dev(div6, br3);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t8);
    			append_dev(div0, p1);
    			append_dev(p1, t9);
    			append_dev(p1, br4);
    			append_dev(p1, t10);
    			append_dev(p1, br5);
    			append_dev(p1, t11);
    			append_dev(p1, a0);
    			append_dev(p1, t13);
    			append_dev(p1, br6);
    			append_dev(p1, t14);
    			append_dev(p1, br7);
    			append_dev(p1, t15);
    			append_dev(p1, br8);
    			append_dev(p1, t16);
    			append_dev(p1, a1);
    			append_dev(p1, br9);
    			append_dev(p1, t18);
    			append_dev(p1, a2);
    			append_dev(p1, br10);
    			append_dev(p1, t20);
    			append_dev(p1, br11);
    			append_dev(p1, t21);
    			append_dev(p1, img0);
    			append_dev(div5, t22);
    			append_dev(div5, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t24);
    			append_dev(div1, p2);
    			append_dev(p2, t25);
    			append_dev(p2, br12);
    			append_dev(p2, t26);
    			append_dev(p2, br13);
    			append_dev(p2, t27);
    			append_dev(p2, br14);
    			append_dev(p2, t28);
    			append_dev(p2, a3);
    			append_dev(p2, t30);
    			append_dev(p2, br15);
    			append_dev(p2, t31);
    			append_dev(p2, br16);
    			append_dev(p2, t32);
    			append_dev(p2, br17);
    			append_dev(p2, t33);
    			append_dev(p2, br18);
    			append_dev(p2, t34);
    			append_dev(p2, br19);
    			append_dev(p2, t35);
    			append_dev(p2, a4);
    			append_dev(p2, t37);
    			append_dev(p2, br20);
    			append_dev(p2, t38);
    			append_dev(p2, a5);
    			append_dev(p2, br21);
    			append_dev(p2, t40);
    			append_dev(p2, br22);
    			append_dev(p2, t41);
    			append_dev(p2, img1);
    			append_dev(div5, t42);
    			append_dev(div5, div2);
    			append_dev(div2, h32);
    			append_dev(div2, t44);
    			append_dev(div2, p3);
    			append_dev(p3, t45);
    			append_dev(p3, br23);
    			append_dev(p3, t46);
    			append_dev(p3, br24);
    			append_dev(p3, t47);
    			append_dev(p3, br25);
    			append_dev(p3, t48);
    			append_dev(p3, br26);
    			append_dev(p3, t49);
    			append_dev(p3, br27);
    			append_dev(p3, t50);
    			append_dev(p3, a6);
    			append_dev(p3, t52);
    			append_dev(p3, br28);
    			append_dev(p3, t53);
    			append_dev(p3, a7);
    			append_dev(p3, t55);
    			append_dev(p3, br29);
    			append_dev(p3, t56);
    			append_dev(p3, br30);
    			append_dev(p3, t57);
    			append_dev(p3, img2);
    			append_dev(div5, t58);
    			append_dev(div5, div3);
    			append_dev(div3, h33);
    			append_dev(div3, t60);
    			append_dev(div3, p4);
    			append_dev(p4, t61);
    			append_dev(p4, br31);
    			append_dev(p4, t62);
    			append_dev(p4, br32);
    			append_dev(p4, t63);
    			append_dev(p4, br33);
    			append_dev(p4, t64);
    			append_dev(p4, br34);
    			append_dev(p4, t65);
    			append_dev(p4, a8);
    			append_dev(p4, t67);
    			append_dev(p4, br35);
    			append_dev(p4, t68);
    			append_dev(p4, br36);
    			append_dev(p4, t69);
    			append_dev(p4, a9);
    			append_dev(p4, t71);
    			append_dev(p4, br37);
    			append_dev(p4, t72);
    			append_dev(p4, br38);
    			append_dev(p4, t73);
    			append_dev(p4, img3);
    			append_dev(div5, t74);
    			append_dev(div5, div4);
    			append_dev(div4, h34);
    			append_dev(div4, t76);
    			append_dev(div4, p5);
    			append_dev(p5, t77);
    			append_dev(p5, br39);
    			append_dev(p5, t78);
    			append_dev(p5, br40);
    			append_dev(p5, t79);
    			append_dev(p5, br41);
    			append_dev(p5, t80);
    			append_dev(p5, em);
    			append_dev(p5, t82);
    			append_dev(p5, br42);
    			append_dev(p5, t83);
    			append_dev(p5, a10);
    			append_dev(p5, t85);
    			append_dev(p5, br43);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
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

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Projects', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/About.svelte generated by Svelte v3.46.2 */

    const file$2 = "src/components/About.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let br0;
    	let t2;
    	let p0;
    	let br1;
    	let t4;
    	let p1;
    	let p2;
    	let p3;
    	let p4;
    	let p5;
    	let br2;
    	let t10;
    	let p6;
    	let t11;
    	let br3;
    	let t12;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "About";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Heliodex";
    			br1 = element("br");
    			t4 = space();
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
    			t10 = space();
    			p6 = element("p");
    			t11 = text("text go here");
    			br3 = element("br");
    			t12 = text("\r\n\ttodo: about page");
    			attr_dev(h1, "class", "svelte-1forcre");
    			add_location(h1, file$2, 125, 1, 2117);
    			add_location(br0, file$2, 126, 1, 2134);
    			attr_dev(p0, "class", "svelte-1forcre");
    			add_location(p0, file$2, 128, 1, 2143);
    			add_location(br1, file$2, 128, 16, 2158);
    			attr_dev(p1, "class", "svelte-1forcre");
    			add_location(p1, file$2, 129, 1, 2165);
    			attr_dev(p2, "class", "ipa svelte-1forcre");
    			add_location(p2, file$2, 129, 15, 2179);
    			attr_dev(p3, "class", "svelte-1forcre");
    			add_location(p3, file$2, 129, 35, 2199);
    			attr_dev(p4, "class", "ipa svelte-1forcre");
    			add_location(p4, file$2, 129, 43, 2207);
    			attr_dev(p5, "class", "svelte-1forcre");
    			add_location(p5, file$2, 129, 63, 2227);
    			add_location(br2, file$2, 129, 73, 2237);
    			add_location(br3, file$2, 133, 13, 2380);
    			attr_dev(p6, "class", "svelte-1forcre");
    			add_location(p6, file$2, 132, 1, 2362);
    			attr_dev(div, "class", "main svelte-1forcre");
    			add_location(div, file$2, 124, 0, 2096);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, p0);
    			append_dev(div, br1);
    			append_dev(div, t4);
    			append_dev(div, p1);
    			append_dev(div, p2);
    			append_dev(div, p3);
    			append_dev(div, p4);
    			append_dev(div, p5);
    			append_dev(div, br2);
    			append_dev(div, t10);
    			append_dev(div, p6);
    			append_dev(p6, t11);
    			append_dev(p6, br3);
    			append_dev(p6, t12);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
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

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('About', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Contact.svelte generated by Svelte v3.46.2 */

    const file$1 = "src/components/Contact.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let br0;
    	let t2;
    	let p;
    	let t3;
    	let br1;
    	let br2;
    	let t4;
    	let a0;
    	let br3;
    	let t6;
    	let a1;
    	let br4;
    	let t8;
    	let a2;
    	let br5;
    	let t10;
    	let a3;
    	let br6;
    	let t12;
    	let a4;
    	let br7;
    	let t14;
    	let a5;
    	let br8;
    	let t16;
    	let a6;
    	let br9;
    	let t18;
    	let br10;
    	let t19;
    	let a7;
    	let br11;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Contact";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			p = element("p");
    			t3 = text("Here's a list of a few of the websites/media that you are able to contact me via.");
    			br1 = element("br");
    			br2 = element("br");
    			t4 = text("\r\n\tGithub: @Heliodex, ");
    			a0 = element("a");
    			a0.textContent = "GitHub.com/Heliodex";
    			br3 = element("br");
    			t6 = text("\r\n\tTwitter: @lwinklly, ");
    			a1 = element("a");
    			a1.textContent = "Twitter.com/lwinklly";
    			br4 = element("br");
    			t8 = text("\r\n\tReddit: u/Heliodex, ");
    			a2 = element("a");
    			a2.textContent = "Reddit.com/u/Heliodex";
    			br5 = element("br");
    			t10 = text("\r\n\tDeveloper Forum: Lewin4, ");
    			a3 = element("a");
    			a3.textContent = "Devforum.Roblox.com/u/lewin4";
    			br6 = element("br");
    			t12 = text("\r\n\tRoblox: @Lewin4, ");
    			a4 = element("a");
    			a4.textContent = "Roblox.com/users/77663253/profile";
    			br7 = element("br");
    			t14 = text("\r\n\tYoutube: @Heliodex, ");
    			a5 = element("a");
    			a5.textContent = "YouTube.com/channel/UC8E2hw963cW5IJXZnBE6_vg";
    			br8 = element("br");
    			t16 = text("\r\n\tDiscord: Heliodex#3590, ");
    			a6 = element("a");
    			a6.textContent = "Discord.com/users/290622468547411968";
    			br9 = element("br");
    			t18 = text("\r\n\tTelegram: @Heliodex");
    			br10 = element("br");
    			t19 = text("\r\n\tEmail: Heli@odex.cf, ");
    			a7 = element("a");
    			a7.textContent = "Heli@odex.cf";
    			br11 = element("br");
    			attr_dev(h1, "class", "svelte-1forcre");
    			add_location(h1, file$1, 125, 1, 2117);
    			add_location(br0, file$1, 126, 1, 2136);
    			add_location(br1, file$1, 129, 82, 2233);
    			add_location(br2, file$1, 129, 86, 2237);
    			attr_dev(a0, "class", "realLink svelte-1forcre");
    			attr_dev(a0, "href", "https://github.com/Heliodex/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$1, 130, 20, 2263);
    			add_location(br3, file$1, 130, 141, 2384);
    			attr_dev(a1, "class", "realLink svelte-1forcre");
    			attr_dev(a1, "href", "https://twitter.com/lwinklly/");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$1, 131, 21, 2411);
    			add_location(br4, file$1, 131, 144, 2534);
    			attr_dev(a2, "class", "realLink svelte-1forcre");
    			attr_dev(a2, "href", "https://www.reddit.com/user/Heliodex/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noopener noreferrer");
    			add_location(a2, file$1, 132, 21, 2561);
    			add_location(br5, file$1, 132, 153, 2693);
    			attr_dev(a3, "class", "realLink svelte-1forcre");
    			attr_dev(a3, "href", "https://devforum.roblox.com/u/lewin4/summary/");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "rel", "noopener noreferrer");
    			add_location(a3, file$1, 133, 26, 2725);
    			add_location(br6, file$1, 133, 173, 2872);
    			attr_dev(a4, "class", "realLink svelte-1forcre");
    			attr_dev(a4, "href", "https://www.roblox.com/users/77663253/profile/");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "rel", "noopener noreferrer");
    			add_location(a4, file$1, 134, 18, 2896);
    			add_location(br7, file$1, 134, 171, 3049);
    			attr_dev(a5, "class", "realLink svelte-1forcre");
    			attr_dev(a5, "href", "https://www.youtube.com/channel/UC8E2hw963cW5IJXZnBE6_vg/");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "rel", "noopener noreferrer");
    			add_location(a5, file$1, 135, 21, 3076);
    			add_location(br8, file$1, 135, 196, 3251);
    			attr_dev(a6, "class", "realLink svelte-1forcre");
    			attr_dev(a6, "href", "https://discord.com/users/290622468547411968");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "rel", "noopener noreferrer");
    			add_location(a6, file$1, 136, 25, 3282);
    			add_location(br9, file$1, 136, 179, 3436);
    			add_location(br10, file$1, 137, 20, 3462);
    			attr_dev(a7, "class", "realLink svelte-1forcre");
    			attr_dev(a7, "href", "mailto:Heli@odex.cf");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "rel", "noopener noreferrer");
    			add_location(a7, file$1, 138, 22, 3490);
    			add_location(br11, file$1, 138, 127, 3595);
    			attr_dev(p, "class", "svelte-1forcre");
    			add_location(p, file$1, 128, 1, 2146);
    			attr_dev(div, "class", "main svelte-1forcre");
    			add_location(div, file$1, 124, 0, 2096);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, t3);
    			append_dev(p, br1);
    			append_dev(p, br2);
    			append_dev(p, t4);
    			append_dev(p, a0);
    			append_dev(p, br3);
    			append_dev(p, t6);
    			append_dev(p, a1);
    			append_dev(p, br4);
    			append_dev(p, t8);
    			append_dev(p, a2);
    			append_dev(p, br5);
    			append_dev(p, t10);
    			append_dev(p, a3);
    			append_dev(p, br6);
    			append_dev(p, t12);
    			append_dev(p, a4);
    			append_dev(p, br7);
    			append_dev(p, t14);
    			append_dev(p, a5);
    			append_dev(p, br8);
    			append_dev(p, t16);
    			append_dev(p, a6);
    			append_dev(p, br9);
    			append_dev(p, t18);
    			append_dev(p, br10);
    			append_dev(p, t19);
    			append_dev(p, a7);
    			append_dev(p, br11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let t4;
    	let button2;
    	let t6;
    	let button3;
    	let t8;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*Page*/ ctx[0];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			body = element("body");
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "Home";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Projects";
    			t4 = space();
    			button2 = element("button");
    			button2.textContent = "About";
    			t6 = space();
    			button3 = element("button");
    			button3.textContent = "Contact";
    			t8 = space();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			if (!src_url_equal(img.src, img_src_value = "/heliodex.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Heliodex Logo");
    			attr_dev(img, "width", "80");
    			attr_dev(img, "height", "80");
    			add_location(img, file, 141, 2, 2501);
    			attr_dev(button0, "class", "sideButton svelte-1forcre");
    			add_location(button0, file, 143, 2, 2575);
    			attr_dev(button1, "class", "sideButton svelte-1forcre");
    			add_location(button1, file, 144, 2, 2653);
    			attr_dev(button2, "class", "sideButton svelte-1forcre");
    			add_location(button2, file, 145, 2, 2739);
    			attr_dev(button3, "class", "sideButton svelte-1forcre");
    			add_location(button3, file, 146, 2, 2819);
    			attr_dev(div, "class", "sidenav svelte-1forcre");
    			add_location(div, file, 138, 1, 2417);
    			attr_dev(body, "class", "svelte-1forcre");
    			add_location(body, file, 137, 0, 2408);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, div);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, button0);
    			append_dev(div, t2);
    			append_dev(div, button1);
    			append_dev(div, t4);
    			append_dev(div, button2);
    			append_dev(div, t6);
    			append_dev(div, button3);
    			append_dev(body, t8);

    			if (switch_instance) {
    				mount_component(switch_instance, body, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*Page*/ ctx[0])) {
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
    					mount_component(switch_instance, body, null);
    				} else {
    					switch_instance = null;
    				}
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
    			if (detaching) detach_dev(body);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			run_all(dispose);
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
    	let Page = Home;

    	function changePage(whichPage) {
    		$$invalidate(0, Page = whichPage);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => changePage(Home);
    	const click_handler_1 = () => changePage(Projects);
    	const click_handler_2 = () => changePage(About);
    	const click_handler_3 = () => changePage(Contact);

    	$$self.$capture_state = () => ({
    		Home,
    		Projects,
    		About,
    		Contact,
    		Page,
    		changePage
    	});

    	$$self.$inject_state = $$props => {
    		if ('Page' in $$props) $$invalidate(0, Page = $$props.Page);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		Page,
    		changePage,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
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
