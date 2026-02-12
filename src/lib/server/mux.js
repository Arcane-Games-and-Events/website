import Mux from '@mux/mux-node';
import { env } from '$env/dynamic/private';

const mux = new Mux({
	tokenId: env.MUX_TOKEN_ID,
	tokenSecret: env.MUX_TOKEN_SECRET,
	jwtSigningKey: env.MUX_SIGNING_KEY_ID,
	jwtPrivateKey: env.MUX_SIGNING_KEY_PRIVATE_KEY
});

export default mux;
