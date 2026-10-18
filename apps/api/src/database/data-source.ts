import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source-options';

export const AppDataSource = new DataSource(dataSourceOptions());
