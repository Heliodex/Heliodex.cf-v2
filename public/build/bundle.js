
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
    function empty() {
        return text('');
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    /* src/App.svelte generated by Svelte v3.45.0 */

    const file = "src/App.svelte";

    // (173:1) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Please fill in all values";
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 173, 2, 4026);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(173:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (153:1) {#if closeDamage && farDamage && closeRange && farRange && multiplier && damageToFind}
    function create_if_block(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*closeDamage*/ ctx[0] * /*multiplier*/ ctx[4] < /*damageToFind*/ ctx[5] && /*farDamage*/ ctx[1] * /*multiplier*/ ctx[4] < /*damageToFind*/ ctx[5]) return create_if_block_1;
    		if (/*closeDamage*/ ctx[0] * /*multiplier*/ ctx[4] >= /*damageToFind*/ ctx[5] && /*farDamage*/ ctx[1] * /*multiplier*/ ctx[4] >= /*damageToFind*/ ctx[5]) return create_if_block_2;
    		if (/*opt*/ ctx[6] < /*closeRange*/ ctx[2] && /*opt*/ ctx[6] < /*farRange*/ ctx[3]) return create_if_block_3;
    		if (/*opt*/ ctx[6] > /*closeRange*/ ctx[2] && /*opt*/ ctx[6] > /*farRange*/ ctx[3]) return create_if_block_4;
    		if (/*farDamage*/ ctx[1] > /*closeDamage*/ ctx[0]) return create_if_block_5;
    		if (/*farDamage*/ ctx[1] == /*closeDamage*/ ctx[0]) return create_if_block_6;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(153:1) {#if closeDamage && farDamage && closeRange && farRange && multiplier && damageToFind}",
    		ctx
    	});

    	return block;
    }

    // (168:4) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage up to ");
    			t3 = text(/*final*/ ctx[7]);
    			t4 = text(" studs");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 168, 5, 3919);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    			if (dirty & /*final*/ 128) set_data_dev(t3, /*final*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(168:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (166:40) 
    function create_if_block_6(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage all ranges");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 166, 5, 3842);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(166:40) ",
    		ctx
    	});

    	return block;
    }

    // (164:4) {#if farDamage > closeDamage }
    function create_if_block_5(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage past ");
    			t3 = text(/*final*/ ctx[7]);
    			t4 = text(" studs");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 164, 5, 3728);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    			if (dirty & /*final*/ 128) set_data_dev(t3, /*final*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(164:4) {#if farDamage > closeDamage }",
    		ctx
    	});

    	return block;
    }

    // (161:49) 
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage all ranges");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 161, 4, 3617);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(161:49) ",
    		ctx
    	});

    	return block;
    }

    // (159:3) {#if opt < closeRange && opt < farRange }
    function create_if_block_3(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Never deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage");
    			t3 = text(";");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 159, 4, 3507);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			insert_dev(target, t3, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(159:3) {#if opt < closeRange && opt < farRange }",
    		ctx
    	});

    	return block;
    }

    // (156:100) 
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage all ranges");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 156, 3, 3387);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(156:100) ",
    		ctx
    	});

    	return block;
    }

    // (154:2) {#if (closeDamage * multiplier) < damageToFind && (farDamage * multiplier) < damageToFind }
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Never deals ");
    			t1 = text(/*finalDamage*/ ctx[8]);
    			t2 = text(" damage");
    			attr_dev(p, "class", "answer svelte-1q05zo3");
    			add_location(p, file, 154, 3, 3227);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finalDamage*/ 256) set_data_dev(t1, /*finalDamage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(154:2) {#if (closeDamage * multiplier) < damageToFind && (farDamage * multiplier) < damageToFind }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let p0;
    	let t2;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let t5;
    	let div7;
    	let div6;
    	let div0;
    	let p1;
    	let t7;
    	let input0;
    	let t8;
    	let div1;
    	let p2;
    	let t10;
    	let input1;
    	let t11;
    	let div2;
    	let p3;
    	let t13;
    	let input2;
    	let t14;
    	let div3;
    	let p4;
    	let t16;
    	let input3;
    	let t17;
    	let div4;
    	let p5;
    	let t19;
    	let input4;
    	let t20;
    	let div5;
    	let p6;
    	let t22;
    	let input5;
    	let t23;
    	let t24;
    	let br3;
    	let t25;
    	let footer;
    	let br4;
    	let t26;
    	let div8;
    	let p7;
    	let t27;
    	let br5;
    	let t28;
    	let a0;
    	let br6;
    	let t30;
    	let a1;
    	let br7;
    	let t32;
    	let a2;
    	let br8;
    	let t34;
    	let br9;
    	let t35;
    	let div9;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*closeDamage*/ ctx[0] && /*farDamage*/ ctx[1] && /*closeRange*/ ctx[2] && /*farRange*/ ctx[3] && /*multiplier*/ ctx[4] && /*damageToFind*/ ctx[5]) return create_if_block;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "PF Range Calculator";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("This tool calculates how many studs a weapon in Phantom Forces will deal an amount of damage to.");
    			br0 = element("br");
    			t3 = text("\nInput the values for a gun and the tool will calculate the damage dealt at a specified distance with a specified multiplier.");
    			br1 = element("br");
    			t4 = space();
    			br2 = element("br");
    			t5 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "Close-range damage:";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			div1 = element("div");
    			p2 = element("p");
    			p2.textContent = "Long-range damage:";
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			div2 = element("div");
    			p3 = element("p");
    			p3.textContent = "First range number:";
    			t13 = space();
    			input2 = element("input");
    			t14 = space();
    			div3 = element("div");
    			p4 = element("p");
    			p4.textContent = "Second range number:";
    			t16 = space();
    			input3 = element("input");
    			t17 = space();
    			div4 = element("div");
    			p5 = element("p");
    			p5.textContent = "Damage multiplier:";
    			t19 = space();
    			input4 = element("input");
    			t20 = space();
    			div5 = element("div");
    			p6 = element("p");
    			p6.textContent = "Damage to Find:";
    			t22 = space();
    			input5 = element("input");
    			t23 = space();
    			if_block.c();
    			t24 = space();
    			br3 = element("br");
    			t25 = space();
    			footer = element("footer");
    			br4 = element("br");
    			t26 = space();
    			div8 = element("div");
    			p7 = element("p");
    			t27 = text("Version 2.0.1. Last updated 11th January 2022.");
    			br5 = element("br");
    			t28 = text("\n\t\tBuilt with Svelte. See the old version at: ");
    			a0 = element("a");
    			a0.textContent = "OldPFCalc.Heliodex.cf";
    			br6 = element("br");
    			t30 = text("\n\t\tMade by Heliodex. See the code at: ");
    			a1 = element("a");
    			a1.textContent = "https://GitHub.com/Heliodex/PFRangeCalc";
    			br7 = element("br");
    			t32 = text("\n\t\tMy website: ");
    			a2 = element("a");
    			a2.textContent = "Heliodex.cf";
    			br8 = element("br");
    			t34 = text("\n\t\tPlease contact me about any bugs that arise, or file an issue.");
    			br9 = element("br");
    			t35 = space();
    			div9 = element("div");
    			attr_dev(h1, "class", "title svelte-1q05zo3");
    			add_location(h1, file, 116, 0, 1976);
    			add_location(br0, file, 119, 96, 2120);
    			add_location(br1, file, 120, 124, 2249);
    			attr_dev(p0, "class", "svelte-1q05zo3");
    			add_location(p0, file, 118, 0, 2020);
    			add_location(br2, file, 123, 0, 2260);
    			attr_dev(p1, "class", "label svelte-1q05zo3");
    			add_location(p1, file, 127, 3, 2331);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "svelte-1q05zo3");
    			add_location(input0, file, 128, 3, 2375);
    			attr_dev(div0, "class", "value svelte-1q05zo3");
    			add_location(div0, file, 126, 2, 2308);
    			attr_dev(p2, "class", "label svelte-1q05zo3");
    			add_location(p2, file, 131, 3, 2454);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "svelte-1q05zo3");
    			add_location(input1, file, 132, 3, 2497);
    			attr_dev(div1, "class", "value svelte-1q05zo3");
    			add_location(div1, file, 130, 2, 2431);
    			attr_dev(p3, "class", "label svelte-1q05zo3");
    			add_location(p3, file, 135, 3, 2574);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "svelte-1q05zo3");
    			add_location(input2, file, 136, 3, 2618);
    			attr_dev(div2, "class", "value svelte-1q05zo3");
    			add_location(div2, file, 134, 2, 2551);
    			attr_dev(p4, "class", "label svelte-1q05zo3");
    			add_location(p4, file, 139, 3, 2696);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "svelte-1q05zo3");
    			add_location(input3, file, 140, 3, 2741);
    			attr_dev(div3, "class", "value svelte-1q05zo3");
    			add_location(div3, file, 138, 2, 2673);
    			attr_dev(p5, "class", "label svelte-1q05zo3");
    			add_location(p5, file, 143, 3, 2817);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "svelte-1q05zo3");
    			add_location(input4, file, 144, 3, 2860);
    			attr_dev(div4, "class", "value svelte-1q05zo3");
    			add_location(div4, file, 142, 2, 2794);
    			attr_dev(p6, "class", "label svelte-1q05zo3");
    			add_location(p6, file, 147, 3, 2938);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "svelte-1q05zo3");
    			add_location(input5, file, 148, 3, 2978);
    			attr_dev(div5, "class", "value svelte-1q05zo3");
    			add_location(div5, file, 146, 2, 2915);
    			attr_dev(div6, "class", "values svelte-1q05zo3");
    			add_location(div6, file, 125, 1, 2285);
    			attr_dev(div7, "class", "main svelte-1q05zo3");
    			add_location(div7, file, 124, 0, 2265);
    			add_location(br3, file, 177, 0, 4090);
    			add_location(br4, file, 180, 1, 4106);
    			add_location(br5, file, 183, 48, 4187);
    			attr_dev(a0, "href", "https://oldpfcalc.heliodex.cf/");
    			attr_dev(a0, "class", "svelte-1q05zo3");
    			add_location(a0, file, 184, 45, 4237);
    			add_location(br6, file, 184, 111, 4303);
    			attr_dev(a1, "href", "https://github.com/Heliodex/PFRangeCalc");
    			attr_dev(a1, "class", "svelte-1q05zo3");
    			add_location(a1, file, 185, 37, 4345);
    			add_location(br7, file, 185, 130, 4438);
    			attr_dev(a2, "href", "https://heliodex.cf/");
    			attr_dev(a2, "class", "svelte-1q05zo3");
    			add_location(a2, file, 186, 14, 4457);
    			add_location(br8, file, 186, 60, 4503);
    			add_location(br9, file, 187, 64, 4572);
    			attr_dev(p7, "class", "svelte-1q05zo3");
    			add_location(p7, file, 182, 2, 4135);
    			attr_dev(div8, "class", "footer");
    			add_location(div8, file, 181, 1, 4112);
    			attr_dev(footer, "class", "svelte-1q05zo3");
    			add_location(footer, file, 179, 0, 4096);
    			attr_dev(div9, "class", "body svelte-1q05zo3");
    			add_location(div9, file, 192, 0, 4603);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t2);
    			append_dev(p0, br0);
    			append_dev(p0, t3);
    			append_dev(p0, br1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t7);
    			append_dev(div0, input0);
    			set_input_value(input0, /*closeDamage*/ ctx[0]);
    			append_dev(div6, t8);
    			append_dev(div6, div1);
    			append_dev(div1, p2);
    			append_dev(div1, t10);
    			append_dev(div1, input1);
    			set_input_value(input1, /*farDamage*/ ctx[1]);
    			append_dev(div6, t11);
    			append_dev(div6, div2);
    			append_dev(div2, p3);
    			append_dev(div2, t13);
    			append_dev(div2, input2);
    			set_input_value(input2, /*closeRange*/ ctx[2]);
    			append_dev(div6, t14);
    			append_dev(div6, div3);
    			append_dev(div3, p4);
    			append_dev(div3, t16);
    			append_dev(div3, input3);
    			set_input_value(input3, /*farRange*/ ctx[3]);
    			append_dev(div6, t17);
    			append_dev(div6, div4);
    			append_dev(div4, p5);
    			append_dev(div4, t19);
    			append_dev(div4, input4);
    			set_input_value(input4, /*multiplier*/ ctx[4]);
    			append_dev(div6, t20);
    			append_dev(div6, div5);
    			append_dev(div5, p6);
    			append_dev(div5, t22);
    			append_dev(div5, input5);
    			set_input_value(input5, /*damageToFind*/ ctx[5]);
    			append_dev(div7, t23);
    			if_block.m(div7, null);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, br4);
    			append_dev(footer, t26);
    			append_dev(footer, div8);
    			append_dev(div8, p7);
    			append_dev(p7, t27);
    			append_dev(p7, br5);
    			append_dev(p7, t28);
    			append_dev(p7, a0);
    			append_dev(p7, br6);
    			append_dev(p7, t30);
    			append_dev(p7, a1);
    			append_dev(p7, br7);
    			append_dev(p7, t32);
    			append_dev(p7, a2);
    			append_dev(p7, br8);
    			append_dev(p7, t34);
    			append_dev(p7, br9);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, div9, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[12]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[13]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*closeDamage*/ 1 && to_number(input0.value) !== /*closeDamage*/ ctx[0]) {
    				set_input_value(input0, /*closeDamage*/ ctx[0]);
    			}

    			if (dirty & /*farDamage*/ 2 && to_number(input1.value) !== /*farDamage*/ ctx[1]) {
    				set_input_value(input1, /*farDamage*/ ctx[1]);
    			}

    			if (dirty & /*closeRange*/ 4 && to_number(input2.value) !== /*closeRange*/ ctx[2]) {
    				set_input_value(input2, /*closeRange*/ ctx[2]);
    			}

    			if (dirty & /*farRange*/ 8 && to_number(input3.value) !== /*farRange*/ ctx[3]) {
    				set_input_value(input3, /*farRange*/ ctx[3]);
    			}

    			if (dirty & /*multiplier*/ 16 && to_number(input4.value) !== /*multiplier*/ ctx[4]) {
    				set_input_value(input4, /*multiplier*/ ctx[4]);
    			}

    			if (dirty & /*damageToFind*/ 32 && to_number(input5.value) !== /*damageToFind*/ ctx[5]) {
    				set_input_value(input5, /*damageToFind*/ ctx[5]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div7, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div7);
    			if_block.d();
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(footer);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(div9);
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
    	let finalDamage;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let closeDamage = 33;
    	let farDamage = 20;
    	let closeRange = 70;
    	let farRange = 120;
    	let multiplier = 1;
    	let damageToFind = 25;
    	let opt;
    	let final;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		closeDamage = to_number(this.value);
    		$$invalidate(0, closeDamage);
    	}

    	function input1_input_handler() {
    		farDamage = to_number(this.value);
    		$$invalidate(1, farDamage);
    	}

    	function input2_input_handler() {
    		closeRange = to_number(this.value);
    		$$invalidate(2, closeRange);
    	}

    	function input3_input_handler() {
    		farRange = to_number(this.value);
    		$$invalidate(3, farRange);
    	}

    	function input4_input_handler() {
    		multiplier = to_number(this.value);
    		$$invalidate(4, multiplier);
    	}

    	function input5_input_handler() {
    		damageToFind = to_number(this.value);
    		$$invalidate(5, damageToFind);
    	}

    	$$self.$capture_state = () => ({
    		closeDamage,
    		farDamage,
    		closeRange,
    		farRange,
    		multiplier,
    		damageToFind,
    		opt,
    		final,
    		finalDamage
    	});

    	$$self.$inject_state = $$props => {
    		if ('closeDamage' in $$props) $$invalidate(0, closeDamage = $$props.closeDamage);
    		if ('farDamage' in $$props) $$invalidate(1, farDamage = $$props.farDamage);
    		if ('closeRange' in $$props) $$invalidate(2, closeRange = $$props.closeRange);
    		if ('farRange' in $$props) $$invalidate(3, farRange = $$props.farRange);
    		if ('multiplier' in $$props) $$invalidate(4, multiplier = $$props.multiplier);
    		if ('damageToFind' in $$props) $$invalidate(5, damageToFind = $$props.damageToFind);
    		if ('opt' in $$props) $$invalidate(6, opt = $$props.opt);
    		if ('final' in $$props) $$invalidate(7, final = $$props.final);
    		if ('finalDamage' in $$props) $$invalidate(8, finalDamage = $$props.finalDamage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*closeRange, closeDamage, damageToFind, multiplier, farDamage, farRange*/ 63) {
    			$$invalidate(6, opt = closeRange + (closeDamage - damageToFind / multiplier) / (closeDamage - farDamage) * (farRange - closeRange));
    		}

    		if ($$self.$$.dirty & /*opt*/ 64) {
    			$$invalidate(7, final = parseFloat(opt.toFixed(2)));
    		}

    		if ($$self.$$.dirty & /*damageToFind, multiplier*/ 48) {
    			$$invalidate(8, finalDamage = parseFloat((damageToFind * multiplier).toFixed(2)));
    		}
    	};

    	return [
    		closeDamage,
    		farDamage,
    		closeRange,
    		farRange,
    		multiplier,
    		damageToFind,
    		opt,
    		final,
    		finalDamage,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler
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
