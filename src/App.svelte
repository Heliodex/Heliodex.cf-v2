<script defer lang="ts">
	import Home from "./lib/Home.svelte"
	import Projects from "./lib/Projects.svelte"
	import About from "./lib/About.svelte"
	import Contact from "./lib/Contact.svelte"

	const pageDict = {
		"": Home,
		projects: Projects,
		about: About,
		contact: Contact,
	} // Yanderedev lookin
	// it cannot be the other way around, with Home: "#home"

	function getKeyByValue(object, value) {
		return Object.keys(object).find(key => object[key] === value)
	}

	let Page = pageDict[window.location.hash.substring(1)]

	function changePage(whichPage) {
		Page = whichPage // If done in the same line, the svelte:component will not react
		window.location.hash = getKeyByValue(pageDict, whichPage)
	}
</script>

<main>
	<div class="sidenav">
		<!-- Page side navigation buttons go in this div -->

		<img class="logo" src="src/assets/heliodex.svg" alt="Heliodex Logo" width="80" height="80" />

		<button class="sideButton" on:mousedown={() => changePage(Home)}>Home</button>
		<button class="sideButton" on:mousedown={() => changePage(Projects)}>Projects</button>
		<button class="sideButton" on:mousedown={() => changePage(About)}>About</button>
		<button class="sideButton" on:mousedown={() => changePage(Contact)}>Contact</button>

		<p class="version">v2.0.2</p>
	</div>

	<svelte:component this={Page} />
</main>

<style lang="sass">
	.sidenav
		height: 100%
		width: 85px // Sidebar width
		position: fixed // Stay in place when scrolling
		z-index: 1 // Stay on top
		top: 0 //Stay at the top
		left: 0
		background-color: #202020
		overflow-x: hidden // Disable horizontal scroll
		padding-top: 20px
		padding-left: 5px

	.logo
		padding: 0 5px
		width: 70px

	.sideButton // Stolen straight from DocSocial lmao
		border: none
		background-color: #404040
		margin: 4px 5px
		border-radius: 5px
		font-family: lexendDeca
		font-size: 14px
		padding: 5px 0 20px 0
		height: 20px
		cursor: pointer
		color: #e3e3e3
		width: 70px
		display: inline-block

		text-align: center
		text-decoration: none

		&:hover
			transition: transform 0.2s
			transform: scale(1.1)
			background-color: #303030

	.version
		text-align: center
		display: inline-block
		margin: auto

		position: fixed
		bottom: 0 // fix to bottom of page
		left: 0 // be inside rather than outside the sidebar
		width: 70px

	main
		margin: 0 0 15px 100px // Width of the sidebar +15
</style>
