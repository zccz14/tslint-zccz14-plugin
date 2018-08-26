import * as Lint from "tslint";
import * as ts from "typescript";
import { join, sep, parse } from "path";
import { cwd } from "process";
import { SyntaxKind } from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING = "Cannot Import Module";

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(
      new Walker(sourceFile, this.getOptions())
    );
  }
}

class Walker extends Lint.RuleWalker {
  private test(src: string[], path: string[], common: string[][]): boolean {
    const cur = src.slice(0, -1);
    for (let i = 0, len = path.length; i < len; i++) {
      let v = path[i];
      if (v === "..") {
        cur.pop();
      } else if (v === ".") {
      } else {
        cur.push(v);
      }
      //   console.log("cur", cur, i, v);
      const isMatched = common.some(p => p.join("/") === cur.join("/"));
      if (isMatched) return true;
      if (i + 1 < len && v !== ".." && v !== ".") {
        return false;
      }
    }
    return true;
  }
  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const rootDir = cwd().split(sep);
    const src = this.getSourceFile().fileName.split("/"); // API
    const srcPath = src.slice(rootDir.length);
    // console.log("srcPath", srcPath);
    const options: [string[] | undefined] = this.getOptions();
    const commons = options[0] || [];
    const commonPath = commons.map(v => v.split("/"));
    // const commonDirs = commons.map(dir => join(...rootDir, dir));
    // console.log("commonPath", commonPath);
    // ImportDeclaration = 247
    // + ImportKeyword = 91
    // + ImportClause = 248
    // + FromKeyword = 143
    // + moduleSpecifier: StringLiteral = 9
    // + SemicolonToken = 25
    // const baseDir = join(...src, "..");
    const { moduleSpecifier } = node;
    const str = moduleSpecifier.getText().slice(1, -1);
    let path = str.split("/");
    // console.log("path", path);
    let isRelativeRef = path[0] === "." || path[0] === "..";
    if (isRelativeRef) {
      const test = this.test(srcPath, path, commonPath);
      if (!test) {
        this.addFailure(
          this.createFailure(
            node.getStart(),
            node.getWidth(),
            `${Rule.FAILURE_STRING}: ${str}`
          )
        );
      }
    }
    super.visitImportDeclaration(node);
  }
}
