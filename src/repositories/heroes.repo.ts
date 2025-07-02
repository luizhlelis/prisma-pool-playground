import {Hero} from "@models/hero.entity";

export class HeroesRepository {
  // Hero SuperMan = new Hero('1', 'SuperMan', 10, 1000);
  private heroes: Hero[] = [new Hero('1', 'SuperMan', 10, 1000)];

  public findOneById(id: string) {
    return this.heroes.find(hero => hero.id === id);
  }

  public addHero(hero: Hero): void {
    this.heroes.push(hero);
  }

  public getHeroById(id: string): { id: string; name: string } | undefined {
    return this.heroes.find(hero => hero.id === id);
  }

  public getAllHeroes(): { id: string; name: string }[] {
    return this.heroes;
  }

  public removeHeroById(id: string): void {
    this.heroes = this.heroes.filter(hero => hero.id !== id);
  }

  async persist(hero: Hero) {
    console.log(`Hero has been persisted.`);
  }
}