<script>
	import { Router, Route } from 'svelte-routing';
	import Home from '../components/Home.svelte';
	import Projects from '../components/Projects.svelte';
	import About from '../components/About.svelte';
	import Contact from '../components/Contact.svelte';

	export let url = "";
</script>

<Router {url}>
	<div>
		<Route path="/" component={Home}/>
		<Route path="projects" component={Projects}/>
		<Route path="about" component={About}/>
		<Route path="contact" component={Contact}/>

	</div>
</Router>