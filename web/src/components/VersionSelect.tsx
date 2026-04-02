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

const FALLBACK_RELEASES: ReleaseInfo[] = [
  { version: "0.79.2", publishedAt: "2026-03-30T15:53:40Z" },
  { version: "0.79.1", publishedAt: "2026-01-11T14:01:13Z" },
];

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
    throw new Error(`GitHub API request failed with status ${response.status}`);
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
  const [releases, setReleases] = useState<ReleaseInfo[]>(FALLBACK_RELEASES);
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
          setLoadError("No releases found");
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load releases");
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
          <MenuItem disabled={true} text="No versions found." />
        )}
      </Menu>
    </div>
  );

  return (
    <div className="version-select" ref={rootRef}>
      <Button
        id="version-chooser"
        icon="saved"
        intent={loadError ? "warning" : undefined}
        onClick={() => {
          setIsOpen((current) => !current);
          if (isOpen) {
            setQuery("");
          }
        }}
        rightIcon="caret-down"
        text={currentVersion || (isLoading ? "Loading..." : "Select version")}
        title={loadError ?? "Select a React Native macOS version"}
      />
      {isOpen ? menu : null}
    </div>
  );
}
