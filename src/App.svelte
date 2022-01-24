<script>
	import Router from './routes/index.svelte';

	import { Link } from 'svelte-routing';
</script>

<style lang="sass">
	@import src/style.sass
</style>

<body>
	<div class="sidenav">
		<!-- Page side navigation buttons go in this div -->

		<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">
		
		<Link class="headerbutton" To="/">Home</Link>
		<Link class="headerbutton" To="projects">Projects</Link>
		<Link class="headerbutton" To="about">About</Link>
		<Link class="headerbutton" To="contact">Contact</Link>
		
	</div>

	
	<div class="main">
		<Router/>
	</div>
</body>