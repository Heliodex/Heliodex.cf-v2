<script lang="ts">
	import { fly } from "svelte/transition"
</script>

<main in:fly={{ y: 40 }}>
	<h1>About</h1>
	<br />

	<p>Heliodex</p>
	<br />
	<p>/'hiliə</p>
	<p class="ipa">ʊ</p>
	<p>d</p>
	<p class="ipa">ɛ</p>
	<p>ks/</p>
	<br />
	<!-- Mix and match letters with the nearest looking font for phonetic characters. Not a good way of doing it. -->

	<p>
		text go here<br />
		todo: about page
	</p>
</main>

<style lang="sass">
	.ipa
		font-family: Helvetica, Arial, sans-serif // support for phonetic chars
</style>
