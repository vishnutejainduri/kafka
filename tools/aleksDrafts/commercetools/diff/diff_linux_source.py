import click
import csv
# pylint: disable=no-value-for-parameter
@click.command()
@click.argument('first_file', type=click.STRING)
@click.argument('second_file', type=click.STRING)
def run(first_file: str, second_file: str):
    """
    ARGUMENTS:
        'first_file': Path of the first file to be compared
        'second_file': Path of the second file to be compared
    This script checks and outputs the difference in items between two files:
    'first_file' and 'second_file'
    Both files need to be in .csv format with SINGLE columns and line delimited by the comma separator.
    Prior to checking differences, the script will also check for duplicates within each file
    drop them if there exists any.
    The output of this script consists of two files:
    1) 'diff_1.csv': Contains items in the 'first_file' but NOT in the 'second_file'
    2) 'diff_2.csv': Contains items in the 'second_file' but NOT in the 'first_file'
    """
    # read in first file
    lst_1 = []
    print('Reading %s...' % first_file)
    with open(first_file, 'r') as file:
        my_reader = csv.reader(file, delimiter=',')
        for row in my_reader:
            lst_1.append(row[0])
    dup = len(lst_1) - len(set(lst_1))
    print('There are %s items, %s duplicates found.' % (len(lst_1), dup))
    if dup > 0:
        lst_1 = list(set(lst_1))
        print('%s duplicate(s) droppped.' % dup)
    # read in second file
    lst_2 = []
    print('Reading %s...' % second_file)
    with open(second_file, 'r') as file:
        my_reader = csv.reader(file, delimiter=',')
        for row in my_reader:
            lst_2.append(row[0])
    dup = len(lst_2) - len(set(lst_2))
    print('There are %s items, %s duplicates found.' % (len(lst_2), dup))
    if dup > 0:
        lst_2 = list(set(lst_2))
        print('%s duplicate(s) droppped.' % dup)
    # check differences and save
    print('Checking for differences between the two files...\n')
    diff_1 = list(set(lst_1).difference(lst_2))
    print('There are %s item(s) that exist in %s but NOT in %s' % (len(diff_1), first_file, second_file))
    print("Saved differences in current local directory as 'diff_1.csv'.")
    with open('diff_1.csv', 'w') as f:
        for row in diff_1:
            f.write(row + '\n')
    diff_2 = list(set(lst_2).difference(lst_1))
    print('\nThere are %s item(s) that exist in %s but NOT in %s' % (len(diff_2), second_file, first_file))
    print("Saved differences in current local directory as 'diff_2.csv'.")
    with open('diff_2.csv', 'w') as f:
        for row in diff_2:
            f.write(row + '\n')
if __name__ == '__main__':
    run()
