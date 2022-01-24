<script>
	import Router from './routes/index.svelte';
</script>

<style lang="sass">
	@import src/style.sass
</style>

<body>
	<div class="sidenav">
		<!-- Page side navigation buttons go in this div -->

		<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">
	</div>

	
	<div class="main">
		<Router/>
	</div>
</body>