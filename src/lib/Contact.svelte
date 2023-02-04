<script lang="ts">
	import { fly } from "svelte/transition"
</script>

<main in:fly={{ y: 40 }}>
	<h1>Contact</h1>
	<br />

	<p>Here's a list of a few of the websites/media that you are able to contact me via.</p>
	<br />
	<br />
	<table>
		<tr>
			<td>Github</td>
			<td>@Heliodex</td>
			<td>
				<a href="https://github.com/Heliodex/" target="_blank" rel="noopener noreferrer">github.com/Heliodex</a>
			</td>
		</tr>
		<tr>
			<td>Twitter</td>
			<td>@lwinklly</td>
			<td>
				<a href="https://twitter.com/lwinklly/" target="_blank" rel="noopener noreferrer">twitter.com/lwinklly</a>
			</td>
		</tr>
		<tr>
			<td>Youtube</td>
			<td>@lwinklly</td>
			<td>
				<a href="https://youtube.com/@lwinklly/" target="_blank" rel="noopener noreferrer">youtube.com/@lwinklly</a>
			</td>
		</tr>
		<tr>
			<td>Reddit</td>
			<td>u/Heliodex</td>
			<td>
				<a href="https://reddit.com/user/Heliodex/" target="_blank" rel="noopener noreferrer">reddit.com/u/Heliodex</a>
			</td>
		</tr>
		<tr>
			<td>Developer Forum</td>
			<td>@Lewin4</td>
			<td>
				<a href="https://devforum.roblox.com/u/lewin4/summary/" target="_blank" rel="noopener noreferrer">devforum.roblox.com/u/lewin4</a>
			</td>
		</tr>
		<tr>
			<td>Roblox</td>
			<td>@Lewin4</td>
			<td>
				<a href="https://roblox.com/users/77663253/profile/" target="_blank" rel="noopener noreferrer">roblox.com/users/77663253/profile</a>
			</td>
		</tr>
		<tr>
			<td>StackOverflow</td>
			<td>Heliodex</td>
			<td>
				<a href="https://stackoverflow.com/users/12576382/" target="_blank" rel="noopener noreferrer">stackoverflow.com/users/12576382</a>
			</td>
		</tr>
		<tr>
			<td>Discord</td>
			<td>Heliodex#3590</td>
			<td>
				<a href="https://discord.com/users/290622468547411968" target="_blank" rel="noopener noreferrer">discord.com/users/290622468547411968</a>
			</td>
		</tr>
		<tr>
			<td>Telegram</td>
			<td>@Heliodex</td>
			<td>
				<a href="https://t.me/heliodex" target="_blank" rel="noopener noreferrer">t.me/heliodex</a>
			</td>
		</tr>
		<tr>
			<td>Email</td>
			<td> Heli@odex.cf </td>
			<td>
				<a href="mailto:heli@odex.cf" target="_blank" rel="noopener noreferrer">heli@odex.cf</a>
			</td>
		</tr>
	</table>
</main>

<style lang="sass">
	td
		padding-right: 1rem

	@media screen and (max-width: 480px)
		td
			display: block
		tr
			height: 5rem
</style>
