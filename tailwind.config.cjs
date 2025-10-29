/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				brand: {
					blue: "#1e88e5",
					teal: "#14b8a6",
					soft: "#e6f7ff"
				}
			},
			boxShadow: {
				glow: "0 0 0 3px rgba(20,184,166,0.15), 0 10px 30px rgba(30,136,229,0.25)",
				card: "0 8px 30px rgba(0,0,0,0.08)"
			},
			backdropBlur: {
				xs: '2px',
			},
			borderRadius: {
				xl: '1rem',
				'2xl': '1.25rem'
			}
		}
	},
	plugins: [],
};


