const Store = {
  pupils: JSON.parse(localStorage.getItem('kompass32_pupils') || 'null') || SEED.pupils,
  competencies: JSON.parse(localStorage.getItem('kompass32_competencies') || 'null') || SEED.competencies,
  records: JSON.parse(localStorage.getItem('kompass32_records') || '{}'),
  save(){
    localStorage.setItem('kompass32_pupils', JSON.stringify(this.pupils));
    localStorage.setItem('kompass32_competencies', JSON.stringify(this.competencies));
    localStorage.setItem('kompass32_records', JSON.stringify(this.records));
  }
};
