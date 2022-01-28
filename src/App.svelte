<script>
	import Home from "./components/Home.svelte";
	import Projects from "./components/Projects.svelte"; 
	import About from "./components/About.svelte";
	import Contact from "./components/Contact.svelte";

	const pageDict = {"": Home, "projects": Projects, "about": About, "contact": Contact}; // Yanderedev lookin
	// it cannot be the other way around, with Home: "#home"

	function getKeyByValue(object, value) {
		return Object.keys(object).find(key => object[key] === value);
	}

	let Page = pageDict[window.location.hash.substring(1)]; 
	
	function changePage(whichPage) {
		Page = whichPage; // If done in the same line, the svelte:component will not react
		window.location.hash = getKeyByValue(pageDict, whichPage);
	}
</script>

<style lang="sass">
	@import src/style.sass
</style>

<body>
	<div class="sidenav" >
		<!-- Page side navigation buttons go in this div -->

		<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">

		<button class="sideButton" on:click={() => changePage(Home)}>Home</button>
		<button class="sideButton" on:click={() => changePage(Projects)}>Projects</button>
		<button class="sideButton" on:click={() => changePage(About)}>About</button>
		<button class="sideButton" on:click={() => changePage(Contact)}>Contact</button>

		<p class="version">v2.0.21</p>
	</div>

	<svelte:component this={Page} />
</body>