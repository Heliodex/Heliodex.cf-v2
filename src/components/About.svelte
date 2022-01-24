<script>
	import { link } from 'svelte-routing';
</script>

<style lang="sass">
	@import src/style.sass
</style>

<div class="sidenav" >
	<!-- Page side navigation buttons go in this div -->

	<img src="/heliodex.png" alt="Heliodex Logo" width="80" height="80">

	<a use:link class="headerbutton" href="/">Home</a>
	<a use:link class="headerbutton" href="projects">Projects</a>
	<a use:link class="headerbutton" href="about">About</a>
	<a use:link class="headerbutton" href="contact">Contact</a>
</div>

<div class="main">
	<h1>About</h1>
	<br>

	<p>Heliodex</p><br>
	<p>/'hiliə</p><p class="ipa">ʊ</p><p>d</p><p class="ipa">ɛ</p><p>ks/</p><br>
	<!-- Mix and match letters with the nearest looking font for phonetic characters. Not a good way of doing it. -->

	<p>
	text go here<br>
	todo: about page
	</p>
</div>