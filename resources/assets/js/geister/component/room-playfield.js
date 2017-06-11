app.component('roomPlayfield', {
  templateUrl: asset.template('room-playfield'),
  require: {
    roomCtrl: '^room'
  },
  controller() {
    'ngInject';

    this.$onInit = ()=> {
      this.turn = this.roomCtrl.firstUser;
      this.field = null;
      this.selected = null;

      this.roomCtrl.socket.emit('get-playing-info', null, ({won, turn, field}) => {
        this.turn = turn;
        this.setField(field);
        this.roomCtrl.won = won;
      });

      this.roomCtrl.socket.on('rival-acted', ({result, info: {won, turn, field}})=> {
        console.log('rival-acted', result, {won, turn, field});
        this.result = result;
        this.setField(field);
        this.turn = turn;
        this.roomCtrl.won = won;
      });

    };

    this.setField = (rawField)=> {
      this.field = rawField.reduce((result, raw, index)=> {
        const {x, y} = indexToVector(index);
        if (!result[y]) result[y] = [];
        result[y][x] = new Cell(raw, x, y);
        return result;
      }, []);
    };

    this.onClickCell = (cell)=> {
      if (this.roomCtrl.won) return;

      if (this.selected) {
        if (this.selected.isMovableTo(cell)) {
          doMove(cell);
        } else {
          unselect();
        }
      } else {
        if (cell.isMine()) {
          select(cell);
        }
      }
    };

    this.onClickEscape = ()=> {
      if (this.roomCtrl.won) return;

      if (this.selected && this.selected.isEscapable()) {
        doMove();
      }
    };

    const select = (cell)=> {
      this.selected = cell;
      this.emitting = null;
      console.log('selected', cell);
    };

    const unselect = ()=> {
      console.log('unselect');
      this.selected = null;
    };

    const doMove = (cell)=> {
      if (cell) {
        console.log('emit move', this.selected, cell);
      } else {
        console.log('emit escape', this.selected);
      }
      this.emitting = this.roomCtrl.socket.emitAsync('action', {
        from: this.selected.toPoint(),
        to: cell && cell.toPoint()
      }).then(([{result, info: {won, turn, field}}, cbAsync])=> {
        console.log(result, {won, turn, field});
        this.setField(field);
        this.result = result;
        this.turn = turn;
        this.roomCtrl.won = won;
      }).catch(()=> {
        if (cell) {
          console.log('failed move', this.selected, cell);
        } else {
          console.log('failed escape', this.selected);
        }
      }).finally(()=> {
        unselect();
      });
    };

    class Cell {
      constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
      }
      isGood() {
        return this.type[0] == '+';
      }
      isBad() {
        return this.type[0] == '-';
      }
      isMine() {
        return this.isGood() || this.isBad();
      }
      isNextTo(cell) {
        return Math.abs(cell.x - this.x) + Math.abs(cell.y - this.y) == 1;
      }
      isMovableTo(cell) {
        return !cell.isMine() && this.isNextTo(cell);
      }
      isEscapable() {
        return this.isMine() && this.isCorner();
      }
      isCorner() {
        return this.y === 0 && (this.x === 0 || this.x === 5);
      }
      toPoint() {
        return {x: this.x, y: this.y};
      }
    }

    const indexToVector = (index)=> ({x: index % 6, y: Math.floor(index / 6)});
  }
});
