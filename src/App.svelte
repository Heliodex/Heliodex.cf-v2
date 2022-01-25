<script>
	import Home from "./components/Home.svelte";
	import Projects from "./components/Projects.svelte"; 
	import About from "./components/About.svelte";
	import Contact from "./components/Contact.svelte";

	let Page = Home;
	
	function changePage(whichPage) {
		Page = whichPage;
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
	</div>

	<svelte:component this={Page} />
</body>