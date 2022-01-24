<script>
	import { link } from 'svelte-routing';
</script>

<style lang="sass">
	@import src/style.sass
</style>

<div class="sidenav">
	<!-- Page side navigation buttons go in this div -->

	<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">

	<a use:link class="headerbutton" href="/">Home</a>
	<a use:link class="headerbutton" href="projects">Projects</a>
	<a use:link class="headerbutton" href="about">About</a>
	<a use:link class="headerbutton" href="contact">Contact</a>
</div>

<div class="main">
	<h1>Heliodex.cf</h1>
	<p>
	<br>
	Welcome to Heliodex.cf!<br>
	This is my portfolio page where you can see the projects that I've worked on, the teams that I've worked in, and how to contact me.<br>
	</p>
</div>