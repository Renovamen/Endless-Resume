import { ITEM_TABLE } from "../data/item-data";
import store from '../store';
import CreateHero from './create-hero';
import { GetRange, GetRandom } from './public-random-range';
import PGET from '../js/public-static-get';
import Vue from 'vue';

// prototype
import updateAttribute from './hero/update-attribute'

function Unit(obj = {}){
  this.id = 1000 + (Math.random()* 1000).toFixed(0)  // 编号
  this.$type = 'Hero';      // 单位类型
  this.$showName = 'unit' // 展示名称
  this.$alive = true;

  // attribute
  this.$hp          = 600;  // current hp
  this.$maxHp       = 600;  // max hp
  this.$r           = {};

  switch(obj.$type){
    case 'Hero' : 
      CreateHero.call(this, obj);
      break;
  }

  this.updateAttribute(); 
}

Unit.prototype = {
  updateAttribute,
  changeHp,
  getList,
  itemSort,
  getItem,
  equip,
  demount,
  isEnoughInPackage,
  costItem,
}

/* --------------- */

function changeHp(value) {

  let v = parseInt(value);

  if(!v || this.$hp <= 0) return false;      

  let hp = Math.min(this.$hp + value, this.$r.$maxHp);  // update hp
  
  if(hp <= 0){ 
    this.$hp = 0;
    this.$alive = false;
  } // hp < 0, dead
  else this.$hp = hp;

  return true;
}

function getList(key, opt, isIndex){
  let list = this[key];

  if(!list){
    return false;
  }

  let condition;

  if(typeof opt === 'number'){
    condition = i => i && (i.id === opt);
  }

  if(typeof opt === 'object'){
    condition = i => i && (i.id === opt.id);
  }

  if(typeof opt === 'function'){
    condition = opt;
  }

  if(!condition){
    return false;
  }

  return isIndex ? list.findIndex(condition) : list.find(condition);
}

function itemSort(type){
  let list = this[type];

  if(!list || !list.length){
    return false;
  }

  list.sort(
    (a, b) => ((a.id || Infinity) - (b.id || Infinity))
  );

  store.commit('UPDATE');

  return true;
}

function getItem(data, force, type = '$package'){

  let container = force ? this[type] : _.cloneDeep(this[type]),
      surplus = [];
  
  if(!container || !data || !data.length){
    console.warn('[unit.getItem Error]:', data, force, t, this);
    return surplus;
  }

  data.forEach(i => {
    let item,
        num = i[1];

    if(typeof i[0] === 'object'){
      item = i[0];
    }else{
      item = PGET(i[0]);
    }

    let itemInPackage = this.getList(type, { id: item.id }),
        nextBlankPlace = container.findIndex(item => !item);

    item.pile && (item.num = num);

    // 可堆叠且包里存在该物品
    if(itemInPackage && item.pile)
      itemInPackage.num = (itemInPackage.num || 0) + num;
    // 不可堆叠或包里不存在该物品
    else {
      if(~nextBlankPlace) container[nextBlankPlace] = item; // 有空位
      else surplus.push(i); // 没空位
    }
  })

  store.commit('UPDATE');

  return surplus;
}

function equip(item, index, type = '$package'){
  // 0基本 1教育 2课程 3技能 4兴趣 5项目1 6项目2 7项目3 8项目4 
  // 9项目5 10研究1 11研究2 12论文 13经历
  let container = this[type],
      $equipments = this.$equipments,
      equip = item.equip;
  
  if(!equip || !container || !$equipments){
    return false;
  }

  // 删除包裹中的装备, 如果已有装备, 卸载装备;
  container[index] = undefined;

  if($equipments[item.equipType]){
    this.demount(item.equipType, index, type);
  }

  $equipments[item.equipType] = item;

  this.updateAttribute();

  store.commit('UPDATE');

  return true;
}

function demount(equipType, index, type = '$package'){
  let container = this[type],
      equipItem = this.$equipments[equipType],
      $equipments = this.$equipments;

  $equipments[equipType] = 0;

  if(!equipItem){
    return ;
  }

  index = index || container.findIndex(i => !i);

  if(~index){
    container[index] = equipItem;
  }else{
    $equipments[equipType] = equipItem;
    return false;
  }

  this.updateAttribute();

  store.commit('UPDATE');
  
}

function costItem(list, type = '$package'){
  let container = this[type];

  for(let opt of list){
    let index = this.getList(type, opt[0], true);

    let num = (()=>{
      if(typeof opt[1] === 'function'){
        return opt[1].call(this);
      }
      return opt[1];
    })();

    container[index].num -= num;

    if(!container[index].num){
      container[index] = undefined;
    }
  }

}

function isEnoughInPackage(list, type = '$package'){
  // [
  //   [200001, 5]
  //   [function(item){ return item.id === 200001}, function(item){ return 10; }, '测试物品1','10']
  // ]
  let container = this[type];

  if(!container || !list || !list.length ){
    return false;
  }

  for(let opt of list){
    let item;

    item = this.getList(type, opt[0]);
    
    let num = (()=>{
      if(typeof opt[1] === 'function'){
        return opt[1].call(this);
      }
      return opt[1];
    })();

    if(!item || (item.num || 1) < num){
      return false;
    }
  }
  
  return true;
}

export default Unit;