<script>
	let closeDamage = 33;
	let farDamage = 20;
	let closeRange = 70;
	let farRange = 120;
	let multiplier = 1;
	let damageToFind = 2;
	let opt;
	let final;

	$: opt = (closeRange + ((closeDamage - damageToFind / multiplier) / (closeDamage - farDamage)) * (farRange - closeRange));
	$: final = parseFloat(opt.toFixed(2));
	$: finalDamage = parseFloat((damageToFind).toFixed(2));
</script>

<style lang="sass">
	@font-face
		font-family: "Heliodex"
		src: url('/heliodex.ttf')

	@font-face
		font-family: "ReadexPro"
		src: url('/ReadexPro-Regular.ttf')


	.body // solution to white borders
		position: fixed
		height: 100%
		width: 100%
		background-color: #121212
		transform: translate(-8px) // WORST SOLUTION EVER. Otherwise there would be a white border on the left side.


		top: 0
		z-index: -1
	p
		color: #e3e3e3

		font-family: ReadexPro, sans-serif

		text-align: center
		float: center


	input
		border: 0px solid #ffffff
		padding: 5px 10px
		margin: 5px 2px
		border-radius: 8px
		background-color: #404040
		color: #e3e3e3
		outline: none
		width: 175px

		font-family: ReadexPro, sans-serif


	.label
		border: 0px solid #ffffff
		padding: 0px
		margin: 0px

	.title
		font-family: Heliodex, 'Trebuchet MS', sans-serif
		font-size: 48px
		line-height: 38px
		font-weight: normal

		color: #e3e3e3
		text-align: center

	.main
		background-color: #202020
		max-width: 450px
		min-width: 200px
		padding: 30px 10px
		border-radius: 8px
		float: center
		text-align: center

		margin: auto
		width: 50%

	.value
		margin: 10px 0px

	@media screen and (min-width: 800px) 
		.values
			display: grid
			grid-template-columns: auto auto

	a
		&:link
			color: cyan
		&:visited 
			color: palevioletred
		&:hover 
			color: red
		&:active 
			color: yellow

		background-color: transparent
		text-decoration: underline

	footer
			background-color: #171717
			color: #e3e3e3 !important
			margin-top: 20px
			height: 18%
			width: 100%
			position: fixed
			bottom: 0

</style>

<h1 class="title">PF Range Calculator</h1>

<p>
This tool calculates how many studs a weapon in Phantom Forces will deal an amount of damage to.<br>
Input the values for a gun, and the tool will calculate the damage dealt at a specified distance with a specified multiplier.<br>
</p>

<br>
<div class="main">
	<div class="values">
		<div class="value">
			<p class="label">Close-range damage:</p>
			<input type=number bind:value={closeDamage}>
		</div>
		<div class="value">
			<p class="label">Long-range damage:</p>
			<input type=number bind:value={farDamage}>
		</div>
		<div class="value">
			<p class="label">First range number:</p>
			<input type=number bind:value={closeRange}>
		</div>
		<div class="value">
			<p class="label">Second range number:</p>
			<input type=number bind:value={farRange}>
		</div>
		<div class="value">
			<p class="label">Damage multiplier:</p>
			<input type=number bind:value={multiplier}>
		</div>
		<div class="value">
			<p class="label">Damage to Find:</p>
			<input type=number bind:value={damageToFind}>
		</div>
	</div>

	{#if closeDamage && farDamage && closeRange && farRange && multiplier && damageToFind}
		{#if (closeDamage * multiplier) < damageToFind && (farDamage * multiplier) < damageToFind }
			<p class="answer"> Never deals {finalDamage} damage</p>
		{:else if (closeDamage * multiplier) >= damageToFind && (farDamage * multiplier) >= damageToFind }
			<p class="answer"> Deals {finalDamage} damage all ranges</p>
		{:else}
			{#if opt < closeRange && opt < farRange }
				<p class="answer">Never deals {finalDamage} damage</p>;
			{:else if opt > closeRange && opt > farRange }
				<p class="answer">Deals {finalDamage} damage all ranges</p>
			{:else}
				{#if farDamage > closeDamage }
					<p class="answer">Deals {finalDamage} damage past {final} studs</p>
				{:else if farDamage == closeDamage }
					<p class="answer">Deals {finalDamage} damage all ranges</p>
				{:else}
					<p class="answer">Deals {finalDamage} damage up to {final} studs</p>
				{/if}
			{/if}
		{/if}
	{:else}
		<p class="answer">Please fill in all values</p>
	{/if}
</div>	

<br>

<footer>
	<br>
	<div class="footer">
		<p>
		Version 2.0.1. Last updated 11th January 2022.<br>
		Built with Svelte. See the old version at: <a href="https://oldpfcalc.heliodex.cf/">OldPFCalc.Heliodex.cf</a><br>
		Made by Heliodex. See the code at: <a href="https://github.com/Heliodex/PFRangeCalc">https://GitHub.com/Heliodex/PFRangeCalc</a><br>
		My website: <a href="https://heliodex.cf/">Heliodex.cf</a><br>
		Please contact me about any bugs that arise, or file an issue.<br>
		</p>
	</div>
</footer>

<div class="body"></div>