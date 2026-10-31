import { CoverPage } from "./components/cover-page/CoverPage";
import { ExportPanel } from "./components/export-panel/ExportPanel";
import { FigureProvider } from "./components/figure/FigureProvider";
import { Header } from "./components/header/Header";
import { ThemeToggle } from "./components/theme-toggle/ThemeToggle";
import { ThemePanel } from "./components/theme-panel/ThemePanel";
import { TableOfContent } from "./components/toc/TableOfContent";
import { TopButton } from "./components/top-button/TopButton";
import Report, { toc } from "./report.mdx";
import "./custom/variables";
import { mdxComponents } from "./overrides";
import UML from "./assets/uml.png";

export default function App() {
  return (
    <div className="page">
      <Header title="Rapport SAÉ - Base de donnée" />
      <main>
        <CoverPage
          title="SimuLABle - Base de donnée"
          date="Oct. 2026"
          coverMedia={{
            content: <img src={UML} />,
            ariaLabel: "UML de la BDD de SimuLABle",
          }}
          authors={[
            {
              firstName: "Noah",
              lastName: "GAUCHE PEREIRA",
              alias: "ElPotatoCorp",
              href: "https://github.com/ElPotatoCorp",
            },
            {
              firstName: "Eliot",
              lastName: "NADOUCE BOUROTTE",
              alias: "Frozen1753",
              href: "https://github.com/Frozen1753",
            },
            {
              firstName: "Grigor",
              lastName: "GASPARYAN",
              alias: "GG-003",
              href: "https://github.com/GG-003",
            },
          ]}
          affiliations={[
            "IUT Dijon-Auxerre-Nevers — Département Informatique, site de Nevers",
          ]}
        />

        <TableOfContent items={toc} />

        <div className="content">
          <FigureProvider>
            <Report components={mdxComponents} />
          </FigureProvider>
        </div>
      </main>

      <TopButton />
      <div className="floating-buttons">
        <ThemeToggle />
        {import.meta.env.DEV && (
          <>
            <ExportPanel />
            <ThemePanel />
          </>
        )}
      </div>
    </div>
  );
}
