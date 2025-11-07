<script>
	export let form;
</script>

<h1>Sign Up</h1>
<form method="POST">
	<label>Email <input type="email" name="email" required /></label><br />
	<label>Password <input type="password" name="password" minlength="6" required /></label><br />
	{#if form?.error}<p style="color:red">{form.error}</p>{/if}
	<button type="submit">Create account</button>
</form>
