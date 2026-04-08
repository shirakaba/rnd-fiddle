import { Button, InputGroup, Menu, MenuItem } from "@blueprintjs/core";
import { useEffect, useMemo, useRef, useState } from "react";

type ReleaseInfo = {
  publishedAt: string;
  version: string;
};

type VersionSelectProps = {
  currentVersion: string;
  onVersionSelect: (version: string) => void;
};

const IS_DEBUG_BUILD = import.meta.env.DEV;
const FALLBACK_RELEASES: ReleaseInfo[] = [
  { version: "0.79.2", publishedAt: "2026-03-30T15:53:40Z" },
  { version: "0.79.1", publishedAt: "2026-01-11T14:01:13Z" },
];
const RELEASE_FETCH_ERROR_MESSAGE = "Unable to fetch. Try again later.";
const VERSION_LABEL_PREFIX = "React Native macOS v";
const LOADING_PLACEHOLDER = <span aria-hidden="true" className="version-chooser-shimmer" />;

function compareVersionsDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

async function fetchReleases(signal?: AbortSignal) {
  const response = await fetch("https://api.github.com/repos/shirakaba/rnmprebuilds/releases", {
    headers: {
      Accept: "application/vnd.github+json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const releases = (await response.json()) as Array<{
    published_at?: string;
    tag_name?: string;
  }>;

  return releases
    .filter(
      (release): release is { published_at: string; tag_name: `v${string}` } =>
        typeof release.tag_name === "string" &&
        typeof release.published_at === "string" &&
        release.tag_name.startsWith("v"),
    )
    .map((release) => ({
      publishedAt: release.published_at,
      version: release.tag_name.slice(1),
    }))
    .sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export function VersionSelect({ currentVersion, onVersionSelect }: VersionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    void fetchReleases(abortController.signal)
      .then((nextReleases) => {
        if (nextReleases.length > 0) {
          setReleases(nextReleases);
          setLoadError(null);
        } else {
          setLoadError(RELEASE_FETCH_ERROR_MESSAGE);
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;

        const message = error instanceof Error ? error.message : "Failed to load releases";
        const shouldUseDebugFallback =
          IS_DEBUG_BUILD &&
          (message === "GitHub API error: 403" || message === "GitHub API error: 504");

        if (shouldUseDebugFallback) {
          setReleases(FALLBACK_RELEASES);
          setLoadError(
            `GitHub rate limit hit during development. Falling back to cached releases.`,
          );
          return;
        }

        setReleases([]);
        setLoadError(RELEASE_FETCH_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentVersion && releases[0]) {
      onVersionSelect(releases[0].version);
      return;
    }

    if (
      currentVersion &&
      !releases.some((release) => release.version === currentVersion) &&
      releases[0]
    ) {
      onVersionSelect(releases[0].version);
    }
  }, [currentVersion, onVersionSelect, releases]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredReleases = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) return releases;

    return releases
      .map((release) => ({
        index: release.version.toLowerCase().indexOf(loweredQuery),
        release,
      }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index)
      .map(({ release }) => release);
  }, [query, releases]);

  const menu = (
    <div className="version-select-menu">
      <InputGroup
        autoFocus
        leftIcon="search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter versions..."
        value={query}
      />
      <Menu>
        {filteredReleases.length > 0 ? (
          filteredReleases.map((release) => (
            <MenuItem
              active={release.version === currentVersion}
              icon="history"
              key={release.version}
              label={new Date(release.publishedAt).toLocaleDateString()}
              onClick={() => {
                onVersionSelect(release.version);
                setIsOpen(false);
                setQuery("");
              }}
              text={release.version}
            />
          ))
        ) : (
          <MenuItem disabled={true} text={loadError ?? "No versions found."} />
        )}
      </Menu>
    </div>
  );

  const buttonText = currentVersion
    ? `${VERSION_LABEL_PREFIX}${currentVersion}`
    : isLoading
      ? LOADING_PLACEHOLDER
      : loadError
        ? "Unable to fetch"
        : "Select version";

  return (
    <div className="version-select" ref={rootRef}>
      <Button
        className={isLoading ? "version-chooser-loading" : undefined}
        id="version-chooser"
        icon="saved"
        intent={loadError ? "warning" : undefined}
        disabled={!isLoading && releases.length === 0}
        onClick={() => {
          if (!isLoading && releases.length === 0) return;
          setIsOpen((current) => !current);
          if (isOpen) {
            setQuery("");
          }
        }}
        rightIcon="caret-down"
        text={buttonText}
        title={loadError ?? "Select a React Native macOS version"}
      />
      {isOpen ? menu : null}
    </div>
  );
}
