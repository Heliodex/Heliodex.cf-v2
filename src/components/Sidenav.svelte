<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function forward(component) {
		dispatch("pageChange", {
			component: component
		});
	}
</script>

<style lang="sass">
	@import src/style.sass
</style>

<div class="sidenav" >
	<!-- Page side navigation buttons go in this div -->

	<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">

	<button class="sidebarLink"  on:click={forward("<Home />")} type="button">Home</button>
	<button class="sidebarLink"  on:click={forward("<Projects />")} type="button">Projects</button>
	<button class="sidebarLink"  on:click={forward("<About />")} type="button">About</button>
	<button class="sidebarLink"  on:click={forward("<Contact />")} type="button">Contact</button>
</div>