const Store = {
  sprints: JSON.parse(localStorage.getItem('kompass33_sprints') || 'null') || SEED.sprints,
  subjects: JSON.parse(localStorage.getItem('kompass33_subjects') || 'null') || SEED.subjects,
  pupils: JSON.parse(localStorage.getItem('kompass33_pupils') || 'null') || SEED.pupils,
  competencies: JSON.parse(localStorage.getItem('kompass33_competencies') || 'null') || SEED.competencies,
  records: JSON.parse(localStorage.getItem('kompass33_records') || '{}'),
  lebDrafts: JSON.parse(localStorage.getItem('kompass33_lebDrafts') || '{}'),
  save(){
    localStorage.setItem('kompass33_sprints', JSON.stringify(this.sprints));
    localStorage.setItem('kompass33_subjects', JSON.stringify(this.subjects));
    localStorage.setItem('kompass33_pupils', JSON.stringify(this.pupils));
    localStorage.setItem('kompass33_competencies', JSON.stringify(this.competencies));
    localStorage.setItem('kompass33_records', JSON.stringify(this.records));
    localStorage.setItem('kompass33_lebDrafts', JSON.stringify(this.lebDrafts));
  }
};
