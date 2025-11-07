<script>
	export let form;
</script>

<h1>Log In</h1>
<form method="POST">
	<label>Email <input type="email" name="email" required /></label><br />
	<label>Password <input type="password" name="password" required /></label><br />
	{#if form?.error}<p style="color:red">{form.error}</p>{/if}
	<button type="submit">Log in</button>
</form>
