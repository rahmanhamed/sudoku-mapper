class Cell {
  private isSolved: Boolean = false;
  constructor(public readonly index: number, private value?: number) {
    if (index < 0 || index > 80) {
      throw `incorrect index ${index}`;
    }

    if (value !== null && (value < 1 || value > 9)) {
      throw `incorrect value ${value}`;
    }
  }

  public rowIndex() {
    return Math.floor(this.index / 9);
  }
  
  public colIndex() {
    return this.index % 9;
  }

  public squareIndex() {
    return Math.floor(this.colIndex() / 3) + 3 * Math.floor(this.rowIndex() / 3);
  }

  public solve(value: number) {
    this.isSolved = true;
    if (value < 1 || value > 9) {
      throw `incorrect value ${value}`;
    }
    this.value = value;
  }

  public getValue() {
    return this.value;
  }

  public solved(): Boolean {
    return this.isSolved;
  }
}

class CellGroup {
  protected cells: Cell[];
  constructor() {
    this.cells = [];
  }

  public addCell(cell: Cell) {
    if (this.cells.length >= 9) {
      throw "cannot add more cells";
    }
    this.cells.push(cell);
  }

  public getCellByIndex(index: number): Cell {
    return this.cells[index];
  }

  public getCells(): Cell[] {
    return this.cells;
  }
}

class Grid {
  protected rows: CellGroup[];
  protected cols: CellGroup[];
  protected squares: CellGroup[];
  protected cells: Cell[];

  constructor() {
    this.reset();
  }

  public reset() {
    this.rows = this.createCellGroupArray();
    this.cols = this.createCellGroupArray();
    this.squares = this.createCellGroupArray();
    this.cells = [];
  }

  public getSquares(): CellGroup[] {
    return this.squares;
  }  

  public getCols(): CellGroup[] {
    return this.cols;
  }

  public getRows(): CellGroup[] {
    return this.rows;
  }



  private createCellGroupArray() {
    const groups = new Array<CellGroup>(9);
    for (let i = 0; i < 9; i++) {
      groups[i] = (new CellGroup());
    }
    return groups;
  }

  public addCell(value?: number) {
    const index = this.cells.length;
    const cell = new Cell(index, value || null);
    this.cells.push(cell);
    
    this.rows[cell.rowIndex()].addCell(cell);
    this.cols[cell.colIndex()].addCell(cell);
    //console.log('index', index, 'row', cell.rowIndex(), 'col', cell.colIndex(), 'square', cell.squareIndex())
    this.squares[cell.squareIndex()].addCell(cell);
  }

  public getCellRow(cell: Cell): CellGroup {
    const rowIndex = cell.rowIndex();
    const row = this.rows[rowIndex];
    return row;
  }

  public getCellCol(cell: Cell): CellGroup {
    const colIndex = cell.colIndex();
    const col = this.cols[colIndex];
    return col;
  }

  public getCellSquare(cell: Cell): CellGroup {
    const squareIndex = cell.squareIndex();
    const square = this.squares[squareIndex];
    return square;
  }

  public getSquare(position: number): CellGroup {
    return this.squares[position];
  }

  public getCol(position: number): CellGroup {
    return this.cols[position];
  }

  public getRow(position: number): CellGroup {
    return this.rows[position];
  }

  public getCells() {
    return this.cells;
  }

  public getCell(position: number) {
    return this.cells[position];
  }

  public clone() {
    const grid = new Grid();
    this.cells.forEach((cell: Cell) => {
      grid.addCell(cell.getValue());
    })
  }
}


class UnsolvedCell
{
  constructor(public readonly cell: Cell, public possibilities: number[]) {

  }

  public removePossibility(value: number): boolean {
    const valueIndex = this.possibilities.indexOf(value);
    if (valueIndex !== -1) {
      this.possibilities.splice(valueIndex, 1);
      return true;
    }
    return false;
  }

  public addPossibility(value: number): boolean {
    if (value < 1 || value > 9) {
      throw "invalid suggestion";
    }
    if(this.possibilities.indexOf(value) !== -1) {
      return false;
    }
    this.possibilities.push(value);
    return true;
  }

  public clear() {
    this.possibilities = [];
  }
}

class Solution
{
  private attempts: number = 0;
  private unsolvedCells: UnsolvedCell[];
  private allValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private possibilitiesAdded: boolean;
  constructor(protected readonly grid: Grid) {
    this.unsolvedCells = [];
    grid.getCells().forEach(cell => {
      if (!cell.getValue()) {
        this.unsolvedCells.push(new UnsolvedCell(cell, []));
      }
    })
    
  }

  public getCellPossibilities(cell: Cell) {
    
    if (cell.solved()) {
      throw "cell already solved";
    }
    const unsolvedCell: UnsolvedCell = this.unsolvedCells.find((unsolvedCell: UnsolvedCell) => unsolvedCell.cell.index === cell.index );
    if (unsolvedCell) {
      return unsolvedCell.possibilities;
    }
  }

  public solve(recurse: boolean, callBack: () => any) {
    
    this.attempts++;
    if (this.attempts > 1000) {
      console.error('too many attempts');
      return;
    }
    if (this.attempts === 1) {
      this.calculatePossibilities();
      this.possibilitiesAdded = true;
      callBack && callBack();
    }
    
    let changed = false;
    if (this.solveSinglePossibilities()) {
      callBack && callBack();
      changed = true;
      this.calculatePossibilities();
      callBack && callBack();
    }
    
    if (this.solveUniquePossibilitiesInGroup()) {
      callBack && callBack();
      changed = true;
      this.calculatePossibilities();
      callBack && callBack();
    }


    if (this.reduceSimilarCells()) {
      callBack && callBack();
      changed = true;
    }

    if (this.reduceUniqueInSquareRowOrCol()) {
      callBack && callBack();
      changed = true;
    }

    
    if (this.reduceThreeCellsWithTwoPossibilitiesEach()) {
      callBack && callBack();
      changed = true;
    }

    console.log(this.attempts);
    if (!this.validate()) {
      throw "we made a mistake";
    }

    if (changed && recurse) {
      this.solve(recurse, callBack);
    }
    this.cleanupUnsolvedCells();
    return this.unsolvedCells.length === 0;
  }

  public validate() {
    return !this.unsolvedCells.some((unsolvedCell: UnsolvedCell) => {
      return unsolvedCell.possibilities.length === 0;
    });
  }

  public calculatePossibilities() {
    let possibilitiesChanged = false;
    this.unsolvedCells.forEach((unsolvedCell: UnsolvedCell, index: number) => {
      const cell = unsolvedCell.cell;
      if (cell.solved()) {
        return;
      }
      this.allValues.forEach(value => {
        const valueFoundInGroup: CellGroup = [this.grid.getCellRow(cell), this.grid.getCellCol(cell), this.grid.getCellSquare(cell)].find((group: CellGroup) => {
          return this.valueInGroup(value, group);
        });
        if (valueFoundInGroup) {
          if (this.removeValueFromUnsolvedCell(cell, value)) {
            possibilitiesChanged = true;
          }
        } else if (!this.possibilitiesAdded && unsolvedCell.addPossibility(value)) {
          possibilitiesChanged = true;
        }
      });
    })

    if (possibilitiesChanged) {
      this.cleanupUnsolvedCells();
    }

    return possibilitiesChanged;
  }

  private cleanupUnsolvedCells() {
    const toDelete: UnsolvedCell[] = this.unsolvedCells.filter((unsolvedCells: UnsolvedCell) => {
      return unsolvedCells.cell.getValue();
    });
    toDelete.forEach((unsolvedCellToDelete: UnsolvedCell) => {
      const index: number = this.unsolvedCells.findIndex((unsolvedCell: UnsolvedCell): boolean => {
        return unsolvedCellToDelete.cell.index === unsolvedCell.cell.index;
      });
      this.unsolvedCells.splice(index, 1);
    });
  }

  private solveSinglePossibilities() {
    let possibilitiesChanged = false;
    this.unsolvedCells.forEach((unsolvedCell: UnsolvedCell, index: number) => {
      if (possibilitiesChanged) {
        return;
      }
      const cell = unsolvedCell.cell;
      if (cell.getValue()) {
        return;
      }
      if (unsolvedCell.possibilities.length === 1) {
        cell.solve(unsolvedCell.possibilities[0]);
        console.log('single', unsolvedCell.possibilities, cell)
        possibilitiesChanged = true;
      }
    });
    
    return possibilitiesChanged;
  }

  private solveUniquePossibilitiesInGroup() {
    let possibilitiesChanged = false;
    this.unsolvedCells.forEach((unsolvedCell: UnsolvedCell, index: number) => {
      if (possibilitiesChanged) {
        return;
      }
      const cell = unsolvedCell.cell;
      if (cell.solved()) {
        return;
      }
      const uniqueValueInCellGroups: number = unsolvedCell.possibilities.find((suggestedValue: number) => {
        //const groups: CellGroup[] = [this.grid.getCellRow(cell), this.grid.getCellCol(cell), this.grid.getCellSquare(cell)];
        const groups: CellGroup[] = [this.grid.getCellRow(cell), this.grid.getCellCol(cell), this.grid.getCellSquare(cell)];
        const uniqueInGroup = groups.some((group: CellGroup, groupIndex) => {
          return group.getCells().every((groupCell: Cell) => {
            if (groupCell.index === cell.index) {
              return true;
            }
            
            if (groupCell.getValue()) {
              return true;
            }

            const unsolvedGroupCell = this.unsolvedCells.find(unsolvedCell => groupCell.index === unsolvedCell.cell.index);
            if (!unsolvedGroupCell || !unsolvedGroupCell.possibilities.length) {
              return false;
            }
            return unsolvedGroupCell.possibilities.indexOf(suggestedValue) === -1;
          });
        });
        return uniqueInGroup;
      });
      if (uniqueValueInCellGroups) {
        cell.solve(uniqueValueInCellGroups);
        console.log('unique', uniqueValueInCellGroups, cell)
        possibilitiesChanged = true;
      }
    });
    return possibilitiesChanged;
  }

  private reduceSimilarCells() {
    let possibilitiesChanged = false;
    this.unsolvedCells.forEach((unsolvedCell: UnsolvedCell, index: number) => {
      if (possibilitiesChanged) {
        return;
      }
      const cell = unsolvedCell.cell;
      if (cell.solved()) {
        return;
      }
      const groups: CellGroup[] = [this.grid.getCellRow(cell), this.grid.getCellCol(cell), this.grid.getCellSquare(cell)];
      groups.forEach((group: CellGroup) => {
        const similarCellsInGroup: Cell[] = this.getSimilarCellsInGroup(cell, group);
        if (similarCellsInGroup && similarCellsInGroup.length) {
          const otherCells: Cell[] = group.getCells().filter((groupCell: Cell) => {
            return groupCell.index !== cell.index && !groupCell.getValue() && !similarCellsInGroup.some((similarCell: Cell) => {
              return similarCell.index === groupCell.index;
            });
          });
          otherCells.forEach((groupCell: Cell) => {
            unsolvedCell.possibilities.forEach((value: number) => {
              if (this.removeValueFromUnsolvedCell(groupCell, value)) {
                possibilitiesChanged = true;
              }
            });
          })
        }
      })
    });
    return possibilitiesChanged;
  }

  private getCellsWithManyPossililities(group: CellGroup, numberOfPossibilities: number): Cell[] {
    return group.getCells().filter((cell: Cell) => {
      if (cell.getValue()) {
        return;
      }
      const possibilities = this.getCellPossibilities(cell);
      return possibilities && possibilities.length === numberOfPossibilities;
    });
  }

  private reduceThreeCellsWithTwoPossibilitiesEach(): boolean {
    
    let possibilitiesChanged: boolean;
    this.grid.getCols().forEach((col: CellGroup) => {
      if (possibilitiesChanged) {
        return true;
      }
      const cellsWithTwoPossibilities = this.getCellsWithManyPossililities(col, 2);
      if (!cellsWithTwoPossibilities || cellsWithTwoPossibilities.length !== 3) {
        return;
      }

      let commonSquare: CellGroup;
      [[0, 1], [0, 2], [1, 2]].forEach((combination: number[]) => {
        const cells = combination.map((index: number) => cellsWithTwoPossibilities[index]);
        
        const commonSquare = this.getCommonSquare(cells);
        if (commonSquare) {
          const commonPossibilities = this.getCommonPossibilitys(cells);
          if (this.removePossilibilityFromCellsNotInGroup(commonSquare.getCells(), col, commonPossibilities[0])) {
            possibilitiesChanged = true;
          }
        }
      });
    });

    this.grid.getRows().forEach((row: CellGroup) => {
      if (possibilitiesChanged) {
        return true;
      }
      const cellsWithTwoPossibilities = this.getCellsWithManyPossililities(row, 2);
      if (!cellsWithTwoPossibilities || cellsWithTwoPossibilities.length !== 3) {
        return;
      }

      let commonSquare: CellGroup;
      [[0, 1], [0, 2], [1, 2]].forEach((combination: number[]) => {
        const cells = combination.map((index: number) => cellsWithTwoPossibilities[index]);
        
        const commonSquare = this.getCommonSquare(cells);
        if (commonSquare) {
          const commonPossibilities = this.getCommonPossibilitys(cells);
          if (this.removePossilibilityFromCellsNotInGroup(commonSquare.getCells(), row, commonPossibilities[0])) {
            possibilitiesChanged = true;
          }
        }
      });
    });

    return possibilitiesChanged;
  }

  private getCommonPossibilitys(cells: Cell[]) {
    return this.allValues.filter((value: number) => {
      return cells.every((cell: Cell) => {
        return this.getCellPossibilities(cell).indexOf(value) !== -1;
      })
    })
  }

  private getGroupCellsWithPossibility(group: CellGroup, value: number): Cell[] {
    return group.getCells().filter((cell: Cell) => {
      if (cell.getValue()) {
        return false;
      }
      const possibilities = this.getCellPossibilities(cell);
      return possibilities.find((possibility: number) => {
        return possibility === value;
      })
    })
  }

  private getArrayUniques(numbers: number[]): number[] {
    return numbers.filter((v, i, a) => a.indexOf(v) === i);
  }

  private getCommonRow(cells: Cell[]): CellGroup {
    const rowIndices: number[] = cells.map((cell: Cell): number => cell.rowIndex());
    const uniqueRows = this.getArrayUniques(rowIndices);
    if (uniqueRows.length !== 1) {
      return null;
    }
    return this.grid.getRow(uniqueRows[0]);
  }

  private getCommonCol(cells: Cell[]): CellGroup {
    const colIndices: number[] = cells.map((cell: Cell): number => cell.colIndex());
    const uniqueCols = this.getArrayUniques(colIndices);
    if (uniqueCols.length !== 1) {
      return null;
    }
    return this.grid.getCol(uniqueCols[0]);
  }

  private getCommonSquare(cells: Cell[]): CellGroup {
    const squareIndices: number[] = cells.map((cell: Cell): number => cell.squareIndex());
    const uniqueSquares = this.getArrayUniques(squareIndices);
    if (uniqueSquares.length !== 1) {
      return null;
    }
    return this.grid.getSquare(uniqueSquares[0]);
  }
  
  private getUnsolvedCellData(cell: Cell): UnsolvedCell {
    if (cell.getValue()) {
      return null;
    }
    return this.unsolvedCells.find((unsolvedCell: UnsolvedCell) => {
      return unsolvedCell.cell.index === cell.index;
    });
  }
  
  private removeValueFromUnsolvedCell(cell: Cell, value: number): boolean {
    const unsolvedCell: UnsolvedCell = this.getUnsolvedCellData(cell);
    if (!unsolvedCell) {
      return false;
    }
    return unsolvedCell.removePossibility(value);
  }



  private removePossilibilityFromCellsNotInGroup(cells: Cell[], group: CellGroup, value: number): boolean {
    const result = cells.map((cell: Cell) => {
      if (!this.cellInGroup(cell, group)) {
        return this.removeValueFromUnsolvedCell(cell, value);
      }
    })
    return result.find(r => r);
  }
  
  private reduceUniqueInSquareRowOrCol() {
    let possibilitiesChanged = false;
    this.grid.getSquares().forEach((square: CellGroup, squareIndex: number) => {
      this.allValues.forEach((value: number) => {
        if (possibilitiesChanged) {
          return;
        }
        const squareCellsWithPossibility: Cell[] = this.getGroupCellsWithPossibility(square, value);

        if (squareCellsWithPossibility.length <= 1 ) {
          return;
        }
        
        const commonCol: CellGroup = this.getCommonCol(squareCellsWithPossibility);
        if (commonCol) {
          const result = this.removePossilibilityFromCellsNotInGroup(commonCol.getCells(), square, value);
          possibilitiesChanged = possibilitiesChanged || result; 
        }

        const commonRow: CellGroup = this.getCommonRow(squareCellsWithPossibility);
        if (commonRow) {
          const result = this.removePossilibilityFromCellsNotInGroup(commonRow.getCells(), square, value);
          possibilitiesChanged = possibilitiesChanged || result; 
        }
      })
    })
    return possibilitiesChanged;
  }

  protected cellsInSameRow(cells: Cell[]) {
    return cells.map((cell: Cell) => cell.rowIndex()).every((row: number, index: number, rows: number[]) => {
      return row === rows[0];
    })
  }
  protected valueInGroup(value: number, group: CellGroup): boolean {
    if (group.getCells().find((cell: Cell) => cell.getValue() === value)) {
      return true;
    }
  }
  protected cellInGroup(cell: Cell, group: CellGroup): boolean {
    return group.getCells().some((groupCell: Cell) => {
      return cell.index === groupCell.index;
    });
  }

  protected getSimilarCellsInGroup(cell: Cell, group: CellGroup): Cell[] {
    const cellPossibilities = this.getCellPossibilities(cell);
    const similarCells = group.getCells().filter((groupCell: Cell) => {
      if (groupCell.index === cell.index) {
        return false;
      }
      if (groupCell.getValue()) {
        return false;
      }
      const groupCellPossibilities = this.getCellPossibilities(groupCell);
      if (groupCellPossibilities.length === 1) {
        return false;
      }
      const notCommonWithCell: number[] = groupCellPossibilities.filter((value: number) => cellPossibilities.indexOf(value) === -1);
      return notCommonWithCell.length === 0;
    });
    if (similarCells.length >= cellPossibilities.length - 1) {
      return similarCells;
    }
  }

}