import { useState } from "react";

import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-281.5 flex-col border-x border-page-border text-center">
      <section className="flex flex-1 flex-col place-content-center place-items-center gap-6.25 px-0 py-0 max-lg:gap-4.5 max-lg:px-5 max-lg:pt-8 max-lg:pb-6">
        <div className="relative">
          <img
            src={heroImg}
            className="relative z-0 mx-auto w-42.5"
            width="170"
            height="179"
            alt=""
          />
          <img
            src={reactLogo}
            className="absolute inset-x-0 top-[34px] z-10 mx-auto h-7 [transform:perspective(2000px)_rotateZ(300deg)_rotateX(44deg)_rotateY(39deg)_scale(1.4)]"
            alt="React logo"
          />
          <img
            src={viteLogo}
            className="absolute inset-x-0 top-[107px] z-0 mx-auto h-[26px] w-auto [transform:perspective(2000px)_rotateZ(300deg)_rotateX(40deg)_rotateY(39deg)_scale(0.8)]"
            alt="Vite logo"
          />
        </div>
        <div>
          <h1 className="m-0 my-8 font-heading text-[56px] leading-none tracking-[-1.68px] text-page-heading max-lg:my-5 max-lg:text-4xl">
            Get started
          </h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="mb-6 inline-flex rounded-[5px] border-2 border-transparent bg-page-accent-bg px-[10px] py-[5px] font-mono text-base text-page-accent transition-colors hover:border-page-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-accent"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="relative w-full before:absolute before:top-[-4.5px] before:left-0 before:border-[5px] before:border-transparent before:border-l-page-border before:content-[''] after:absolute after:top-[-4.5px] after:right-0 after:border-[5px] after:border-transparent after:border-r-page-border after:content-['']" />

      <section className="flex border-t border-page-border text-left max-lg:flex-col max-lg:text-center">
        <div className="flex-1 border-r border-page-border px-8 py-8 max-lg:border-r-0 max-lg:border-b max-lg:px-5 max-lg:py-6">
          <svg
            className="mb-4 h-[22px] w-[22px] max-lg:mx-auto"
            role="presentation"
            aria-hidden="true"
          >
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2 className="mb-2 font-heading text-2xl leading-[1.18] tracking-[-0.24px] text-page-heading max-lg:text-[20px]">
            Documentation
          </h2>
          <p>Your questions, answered</p>
          <ul className="mt-8 flex list-none gap-2 p-0 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://vite.dev/"
                target="_blank"
              >
                <img className="h-[18px]" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://react.dev/"
                target="_blank"
              >
                <img className="h-[18px] w-[18px]" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div className="hidden flex-1 px-8 py-8 max-lg:px-5 max-lg:py-6">
          <svg
            className="mb-4 h-[22px] w-[22px] max-lg:mx-auto"
            role="presentation"
            aria-hidden="true"
          >
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2 className="mb-2 font-heading text-2xl leading-[1.18] tracking-[-0.24px] text-page-heading max-lg:text-[20px]">
            Connect with us
          </h2>
          <p>Join the Vite community</p>
          <ul className="mt-8 flex list-none gap-2 p-0 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://github.com/vitejs/vite"
                target="_blank"
              >
                <svg className="h-[18px] w-[18px]" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://chat.vite.dev/"
                target="_blank"
              >
                <svg className="h-[18px] w-[18px]" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://x.com/vite_js"
                target="_blank"
              >
                <svg className="h-[18px] w-[18px]" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li className="max-lg:basis-[calc(50%-4px)]">
              <a
                className="flex items-center gap-2 rounded-md bg-page-social px-3 py-1.5 text-base text-page-heading no-underline transition-shadow hover:shadow-elevated max-lg:w-full max-lg:justify-center"
                href="https://bsky.app/profile/vite.dev"
                target="_blank"
              >
                <svg className="h-[18px] w-[18px]" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="relative w-full before:absolute before:top-[-4.5px] before:left-0 before:border-[5px] before:border-transparent before:border-l-page-border before:content-[''] after:absolute after:top-[-4.5px] after:right-0 after:border-[5px] after:border-transparent after:border-r-page-border after:content-['']" />
      <section className="h-[88px] border-t border-page-border max-lg:h-12" />
    </div>
  );
}

export default App;
