import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: "snodeb",
	tagline: "Fast and simple Debian packaging for Node.js projects",
	favicon: "img/favicon.ico",

	// Set the production url of your site here
	url: "https://snodeb.sonel.dev",
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: "/",

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: "soneliem", // Usually your GitHub org/user name.
	projectName: "snodeb", // Usually your repo name.
	deploymentBranch: "main",
	trailingSlash: false,

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl: "https://github.com/soneliem/snodeb/tree/main/website/",
				},
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		// Replace with your project's social card
		navbar: {
			title: "snodeb",
			logo: {
				alt: "snodeb Logo",
				src: "img/logo.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "left",
					label: "Docs",
				},
				{
					href: "https://github.com/soneliem/snodeb",
					label: "GitHub",
					position: "right",
				},
				{
					href: "https://www.npmjs.com/package/snodeb",
					label: "NPM",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Docs",
					items: [
						{
							label: "Introduction",
							to: "/docs/intro",
						},
						{
							label: "Getting Started",
							to: "/docs/intro",
						},
						{
							label: "Support",
							to: "/docs/intro",
						},
					],
				},
				{
					title: "Community",
					items: [
						{
							label: "Discord",
							href: "https://discord.gg/FSA9BM4mqv",
						},
					],
				},
				{
					title: "More",
					items: [
						{
							label: "GitHub",
							href: "https://github.com/soneliem/snodeb",
						},
						{
							label: "NPM",
							href: "https://www.npmjs.com/package/snodeb",
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} snodeb. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
