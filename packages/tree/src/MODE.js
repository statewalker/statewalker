const MODE = {
  LEAF : 1,
  LAST : 2,
  FIRST : 4,
  NEXT : 8,
}
MODE.ENTER = MODE.FIRST | MODE.NEXT;
MODE.EXIT = MODE.LAST | MODE.LEAF;
module.exports = MODE;
