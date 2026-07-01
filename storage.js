const Store = {
  pupils: JSON.parse(localStorage.getItem('kompass31_pupils') || 'null') || SEED.pupils,
  entries: JSON.parse(localStorage.getItem('kompass31_entries') || 'null') || SEED.entries,
  records: JSON.parse(localStorage.getItem('kompass31_records') || '{}'),
  save(){
    localStorage.setItem('kompass31_pupils', JSON.stringify(this.pupils));
    localStorage.setItem('kompass31_entries', JSON.stringify(this.entries));
    localStorage.setItem('kompass31_records', JSON.stringify(this.records));
  }
};
